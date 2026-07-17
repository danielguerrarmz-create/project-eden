/**
 * DrawPage.tsx — `#/draw`. You open on a lawn and start making.
 *
 * WHY. The studio opens on four sliders. Four sliders is a Grasshopper
 * definition with better type: the design act collapses into number entry, the
 * tool contributes arithmetic, and an artist has nothing to do.
 *
 * So: no setup, no wizard, no numbers. Drag a line across the lawn and an arc
 * stands up. Drag a second and a SURFACE appears between them — blended, not
 * unioned, so it swells where they cross and reads as one vault rather than
 * two ribs. Then keep going: more lines grow it, lift raises it under your
 * hand, excavate opens it. The thing stays SOFT the whole time.
 *
 * Baking is the last move, not the second. The old flow went from two arcs
 * straight to a manufacturable kit, which meant the interesting part — making
 * — lasted about four seconds. Now the kit is something you ask for when
 * you're done: hit bake and the soft surface becomes the real gridshell, with
 * nodes, joints, a cut list and a price.
 *
 * Everything the grammar decides is said out loud, because an engine that
 * silently snaps your line to its bounds is a slider wearing a costume.
 *
 * THE MODEL (settled 2026-07-16): the arcs are the GESTURE, not the ribs. Your
 * lines answer where it lands, how much ground it claims and how high it goes;
 * the engine raises its own canopy over that plan with the rules the built
 * thing obeys — eave up between the legs, diving only at the feet. Bake runs
 * the drawing through the REAL engine (generateGeometry -> nesting -> pricing)
 * with a ShapeField, so the lattice roots at your bearings, fills your plan,
 * lies on the sculpted surface and loses members to your holes. NOT faked:
 * the surface, the sculpt, and every number the bake reports.
 *
 * The site step is parked (engine/site.ts + draw/SiteMap.tsx still exist, and
 * still have their tests) — scaffold to come back to.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { SplashHeader } from './splash/SplashHeader';
import { DrawStage, type Tool } from './draw/DrawStage';
import { CinematicCamera } from './draw/CinematicCamera';
import { surfaceSamples, type Framing } from './draw/framing';
import { PRICE_QUALIFIER, priceMetaLine } from './draw/priceCopy';
import { Folly } from '../scene/Folly';
import { webglSupported } from '../ui/webgl';
import { useCanvasSizeGuard } from '../ui/useCanvasSizeGuard';
import { readDrawing, type Spine } from '../engine/fromDrawing';
import {
  isHole,
  surfaceAreaM2,
  surfaceBounds,
  surfaceHeight,
  surfacePeakM,
  type Edit,
  type SurfaceInput,
} from '../engine/surface';
import { shapeFromDrawing } from '../engine/shapeFromDrawing';
import { buildProjectExport, buildDrawingExport, exportFilename } from '../engine/exportProject';
import { useDesign } from '../state/store';

function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  // The draw hint is what you are told once the canopy is already standing, so
  // it cannot be the opening instruction. It used to be, and the caption
  // reverted to "drag a line across the lawn" with two lines drawn and a
  // canopy up: the one state where that sentence is plainly false. The two
  // sentences the opening needs are special-cased below, by line count.
  { id: 'draw', label: 'draw', hint: 'another line grows it' },
  { id: 'lift', label: 'lift', hint: 'press on it and pull up' },
  { id: 'hole', label: 'excavate', hint: 'press on it and drag out a hole' },
];

/** The opening shot. Authored, not derived: it frames the empty lawn. */
const HOME: Framing = { kind: 'pose', position: [5.6, 3.6, 6.6], target: [0, 1.0, 0] };
/**
 * Air left round the object, on whichever axis binds. Measured, not guessed:
 * 1.08 filled 93% of frame height and put the crown and the near foot within a
 * few pixels of the edges, which reads as a crop rather than a composition.
 * 1.22 lands the baked lattice at about three quarters of the frame with an
 * even band top and bottom, and leaves room for the lattice to breathe as the
 * turntable brings its wider axis round.
 */
const FRAME_MARGIN = 1.22;

export function DrawPage() {
  const [arcs, setArcs] = useState<Spine[]>([]);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [tool, setTool] = useState<Tool>('draw');
  const [baked, setBaked] = useState(false);

  // Without this, loading into a non-rendering tab leaves the canvas dead at
  // 300x150 for the life of the page. See the hook — it's not paranoia, it's
  // reproducible.
  useCanvasSizeGuard();

  const surface: SurfaceInput = useMemo(() => ({ arcs, edits }), [arcs, edits]);

  // The soft thing's own measurements — live, and true of what's on screen.
  const areaM2 = useMemo(() => surfaceAreaM2(surface), [surface]);
  const peakM = useMemo(() => surfacePeakM(surface), [surface]);

  // What the engine WOULD build. Computed live so bake is instant and the
  // nudges can talk before you commit, but only rendered once you ask.
  const read = useMemo(
    () => readDrawing({ spines: arcs, outline: undefined }),
    [arcs],
  );

  const setParams = useDesign((s) => s.setParams);
  const setShape = useDesign((s) => s.setShape);
  const outputs = useDesign((s) => s.outputs);
  useEffect(() => {
    if (!baked) return;
    // The drawing IS the input. Hand the generator the shape, not just a
    // footprint number — otherwise it spreads feet evenly round an ellipse and
    // raises its own dome, and everything you sculpted was decoration.
    setShape(shapeFromDrawing(surface));
    setParams(read.params);
  }, [baked, read.params, surface, setParams, setShape]);

  const soft = arcs.length > 0 && !baked;
  const canBake = arcs.length >= 2 && !baked;
  const activeHint = TOOLS.find((t) => t.id === tool)!.hint;

  // --- Camera. The object should fill the frame, and it should move once baked.
  const [framing, setFraming] = useState<Framing>(HOME);
  const [turntable, setTurntable] = useState(false);

  // The framing effects fire on a COUNT changing, not on the surface changing,
  // so a lift or an excavate never yanks the camera out from under the hand
  // doing it. They still need today's surface to measure, so keep it in a ref
  // and sync it first: effects run top to bottom within a component.
  const latest = useRef({ surface, peakM });
  useEffect(() => {
    latest.current = { surface, peakM };
  });

  // The canopy has appeared, or grown another line. Frame the soft thing.
  useEffect(() => {
    if (baked || arcs.length < 2) return;
    const input = latest.current.surface;
    const points = surfaceSamples(
      surfaceBounds(input),
      (p) => surfaceHeight(input, p),
      (p) => isHole(input, p),
    );
    if (points.length === 0) return; // nothing standing yet; leave the camera be
    setFraming({ kind: 'fit', points, margin: FRAME_MARGIN });
  }, [arcs.length, baked]);

  // Baked. Frame the REAL kit, which is not the size of the skin it replaced.
  // Keyed on the geometry rather than on `baked`, because at the render where
  // baked flips true the store still holds the previous geometry: the effect
  // that feeds it the drawing has not run yet. Framing on `baked` alone would
  // fit the frame to whatever the studio was last showing.
  useEffect(() => {
    if (!baked) return;
    // The nodes ARE the object: fitting their box instead would reserve a third
    // of the frame for the empty corners a dome never reaches.
    setFraming({
      kind: 'fit',
      points: outputs.geometry.nodes.map((n) => n.position),
      margin: FRAME_MARGIN,
    });
  }, [baked, outputs.geometry]);

  // Start over: back to the opening shot, so the next take opens where the
  // last one did. The lawn has no object to fit, so this pose is authored.
  useEffect(() => {
    if (arcs.length === 0 && !baked) {
      setFraming(HOME);
      setTurntable(false);
    }
  }, [arcs.length, baked]);

  return (
    <div className="relative min-h-screen w-full bg-paperVellum text-inkBlack">
      <SplashHeader />

      <div className="relative h-[100svh] w-full overflow-hidden pt-[var(--header-h)]">
        <div className="relative h-full w-full p-3">
          <div className="relative h-full w-full overflow-hidden rounded-2xl border border-inkBlack/12">
            {webglSupported() ? (
              <Canvas
                shadows
                dpr={[1, 2]}
                camera={{ position: [5.6, 3.6, 6.6], fov: 42 }}
                className="!absolute inset-0"
                resize={{ debounce: 0, scroll: false }}
              >
                <color attach="background" args={['#F6F4EE']} />
                <fog attach="fog" args={['#F6F4EE', 24, 54]} />
                <ambientLight intensity={0.8} />
                <directionalLight
                  position={[6, 10, 5]}
                  intensity={1.35}
                  castShadow
                  shadow-mapSize={[2048, 2048]}
                  shadow-bias={-0.0002}
                />
                <hemisphereLight args={['#fbfaf5', '#d8cfae', 0.7]} />

                <DrawStage
                  arcs={arcs}
                  edits={edits}
                  tool={tool}
                  enabled={!baked}
                  resolved={baked}
                  onArc={(s) => setArcs((xs) => [...xs, s])}
                  onEdit={(e) => setEdits((xs) => [...xs, e])}
                />

                {/* The bake: soft surface out, real kit in. */}
                {baked && <Folly />}

                <ContactShadows
                  position={[0, 0.015, 0]}
                  opacity={0.24}
                  scale={22}
                  blur={2.6}
                  far={8}
                  color="#5a5443"
                />
                <OrbitControls
                  makeDefault
                  target={[0, 1.0, 0]}
                  minDistance={4}
                  maxDistance={18}
                  maxPolarAngle={Math.PI / 2.05}
                  enablePan={false}
                  // Without damping the view stops dead on pointer-up, which
                  // makes a hand-turned object feel like a stepper motor.
                  enableDamping
                  dampingFactor={0.07}
                  // The turntable yields to the person, instantly and for good.
                  // OrbitControls fires this on the pointer going down, before
                  // any movement, so the object never fights the first drag.
                  onStart={() => setTurntable(false)}
                />
                {/* After OrbitControls on purpose: it must exist before this
                    can read it. */}
                <CinematicCamera framing={framing} turntable={turntable} />
              </Canvas>
            ) : (
              <div className="grid h-full place-items-center p-6">
                <p className="max-w-sm text-center text-sm text-inkBlack/70">
                  The 3D view needs WebGL. Try a current Chrome, Edge, Firefox or Safari.
                </p>
              </div>
            )}

            {/* One line of instruction, and it goes away once it's obeyed. */}
            {!baked && (
              <p className="pointer-events-none absolute inset-x-0 top-5 mx-auto max-w-[44ch] text-center font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-inkBlack/55">
                {arcs.length === 0
                  ? 'drag a line across the lawn'
                  : arcs.length === 1
                    ? 'one more, crossing it'
                    : activeHint}
              </p>
            )}

            {/* Tools. Only once there's something to work on. */}
            {soft && (
              <div className="absolute left-1/2 top-14 flex -translate-x-1/2 gap-1.5">
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    className={`rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] backdrop-blur transition ${
                      tool === t.id
                        ? 'border-inkBlack/60 bg-inkBlack text-paperVellum'
                        : 'border-inkBlack/20 bg-paperVellum/80 hover:border-inkBlack/50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* What it is, while it's still soft. Two numbers, both true. */}
            {soft && (
              <div className="absolute bottom-4 left-4 rounded-xl border border-inkBlack/12 bg-paperVellum/85 px-4 py-3 backdrop-blur">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-inkBlack/45">
                  {areaM2.toFixed(1)} m² · {peakM.toFixed(2)} m tall
                </p>
                <p className="mt-0.5 font-mono text-[9px] tracking-[0.02em] text-inkBlack/35">
                  {arcs.length} {arcs.length === 1 ? 'line' : 'lines'}
                  {edits.length > 0 && ` · ${edits.length} ${edits.length === 1 ? 'edit' : 'edits'}`}
                  {' · not built yet'}
                </p>
              </div>
            )}

            {/* Baked: what the engine actually made of it. */}
            {baked && (
              <>
                <div className="absolute left-4 top-4 max-w-[290px] rounded-xl border border-inkBlack/12 bg-paperVellum/85 px-3.5 py-2.5 backdrop-blur">
                  <ul className="space-y-1.5">
                    {read.nudges.slice(0, 3).map((n, i) => (
                      <li key={i} className="flex gap-2">
                        <span
                          className={`mt-[5px] h-1 w-1 shrink-0 rounded-full ${
                            n.kind === 'held'
                              ? 'bg-[#b8402f]'
                              : n.kind === 'offered'
                                ? 'bg-[#7d8e5b]'
                                : 'bg-inkBlack/30'
                          }`}
                        />
                        <span className="text-[11px] leading-snug text-inkBlack/70">{n.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="absolute bottom-4 left-4 rounded-xl border border-inkBlack/12 bg-paperVellum/85 px-4 py-3 backdrop-blur">
                  {/* The qualifier rides the figure's own baseline rather than
                      sitting under it: it costs no extra line, and nobody reads
                      the number without reading what kind of number it is. */}
                  <div className="flex items-baseline gap-2.5">
                    <p className="font-serif text-[26px] leading-none">
                      £{outputs.price.fixedTotalGBP.toLocaleString()}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-inkBlack/55">
                      {PRICE_QUALIFIER}
                    </p>
                  </div>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-inkBlack/45">
                    {priceMetaLine({
                      footprintM2: outputs.geometry.params.footprintM2,
                      feetCount: outputs.geometry.feetCount,
                      pieceCount: outputs.geometry.pieces.length,
                      nodeCount: outputs.geometry.nodes.length,
                    })}
                  </p>
                </div>
              </>
            )}

            {/* Actions. */}
            <div className="absolute bottom-4 right-4 flex gap-1.5">
              {!baked && (arcs.length > 0 || edits.length > 0) && (
                <Chip
                  onClick={() =>
                    edits.length > 0
                      ? setEdits((xs) => xs.slice(0, -1))
                      : setArcs((xs) => xs.slice(0, -1))
                  }
                >
                  undo
                </Chip>
              )}
              {canBake && (
                <Chip
                  onClick={() => {
                    setBaked(true);
                    setTurntable(true);
                  }}
                  strong
                >
                  bake it
                </Chip>
              )}
              {baked && (
                <>
                  <Chip
                    onClick={() =>
                      download(
                        exportFilename('drawing', null),
                        buildDrawingExport({ spines: arcs }, 0, null),
                      )
                    }
                  >
                    export drawing
                  </Chip>
                  <Chip
                    onClick={() =>
                      download(
                        exportFilename('project', null),
                        buildProjectExport({ spines: arcs }, 0, null, read, outputs),
                      )
                    }
                  >
                    export everything
                  </Chip>
                  <Chip
                    onClick={() => {
                      setBaked(false);
                      setTurntable(false); // you cannot sculpt a moving target
                    }}
                  >
                    keep sculpting
                  </Chip>
                </>
              )}
              {(arcs.length > 0 || edits.length > 0) && (
                <Chip
                  onClick={() => {
                    setArcs([]);
                    setEdits([]);
                    setBaked(false);
                    setTool('draw');
                  }}
                >
                  start over
                </Chip>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({
  children,
  onClick,
  strong = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  strong?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] backdrop-blur transition ${
        strong
          ? 'border-inkBlack/70 bg-inkBlack text-paperVellum hover:opacity-90'
          : 'border-inkBlack/20 bg-paperVellum/80 hover:border-inkBlack/50'
      }`}
    >
      {children}
    </button>
  );
}
