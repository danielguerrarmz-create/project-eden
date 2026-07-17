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
import * as THREE from 'three';
import { SplashHeader } from './splash/SplashHeader';
import { DrawStage, type Tool } from './draw/DrawStage';
import { useSpaceHeld } from './draw/useSpaceHeld';
import { StudioEnvironment } from './draw/StudioEnvironment';
import { PlacedScaleFigure } from './draw/PlacedScaleFigure';
import { BakeReveal, REVEAL_S } from './draw/BakeReveal';
import { makeRevealUniforms } from '../scene/revealShader';
import { CinematicCamera } from './draw/CinematicCamera';
import { RAIL_LINES, TOOLS } from './draw/toolCopy';
import { surfaceSamples, type Framing } from './draw/framing';
import {
  COMMISSION_FROM,
  COMMISSION_LABEL,
  COMMISSION_QUALIFIER,
  COST_BUILDUP_LABEL,
  COST_BUILDUP_NOTE,
  COST_SUMMARY_LABEL,
  PRICE_QUALIFIER,
  STEWARDSHIP_LABEL,
  STEWARDSHIP_NOTE,
  priceMetaLine,
} from '../ui/priceCopy';
import { deDash } from '../ui/text';
import { Folly } from '../scene/Folly';
import { GardenContext } from '../scene/GardenContext';
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
import { useDesign } from '../state/store';

// The toolbar's words and the rail's live in `draw/toolCopy.ts`, where the
// DOM-free suite can pin them. The sculpt hint in particular is the
// highest-leverage sentence in the product and was wrong for months; that
// module's header carries the reasoning.

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
/**
 * How high the camera may climb. `maxPolarAngle` already stopped it going
 * underground; nothing stopped it going straight up, and it went all the way:
 * measured at exactly 0 rad, a dead plan view.
 *
 * WHY CLAMP AT ALL. Straight down is degenerate, not merely unflattering. At
 * polar 0 the view direction is parallel to the rig's up vector, so azimuth
 * stops being defined and the object can spin under a gesture that only meant
 * to tilt. It is also a trap with no handle: there is no horizon left to grab
 * and no obvious way back out.
 *
 * WHY 30° AND NOT MORE, WHICH IS THE TEMPTING MISTAKE. Shot across the range,
 * the SOFT canopy does not read from anywhere above ~50°: its eave, the whole
 * point of the form, is edge-on and the skin is an untextured beige mass, so
 * 40° and 15° are equally a blob. That argues for clamping at 50°. It would be
 * the wrong fix. The skin is illegible from above because it has no detail,
 * which is a material question, and the BAKED lattice — the thing actually on
 * camera — reads beautifully steep: at 25° the oculus, the diagrid and every
 * node are crisp. Clamping to 50° would spend the kit's best views paying for
 * the skin's missing texture.
 *
 * So the clamp only removes what is genuinely broken. 30° keeps every view
 * that measured well and deletes the singularity.
 */
const MIN_POLAR = Math.PI / 6;

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

  // --- The pointer. Left drag makes; right drag and space-drag look.
  const { held: spaceHeld, heldRef: spaceHeldRef } = useSpaceHeld();
  // Only so the hand can close while it turns. Window-level, because the
  // release that matters most is the one that happens off the canvas.
  const [pressing, setPressing] = useState(false);
  useEffect(() => {
    const down = () => setPressing(true);
    const up = () => setPressing(false);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', up);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', up);
    };
  }, []);

  /**
   * System cursors only. The hand says "you are about to move the view, not
   * the thing"; the crosshair says "this gesture lands somewhere precise".
   * Once baked there is no tool, so the pointer stops promising one.
   */
  const cursor = spaceHeld
    ? pressing
      ? 'cursor-grabbing'
      : 'cursor-grab'
    : baked
      ? 'cursor-default'
      : 'cursor-crosshair';

  // One hint, once, when the first canopy stands: the moment there is finally
  // an object worth walking round, and the first moment the user is not busy
  // being told how to draw. NOT persisted to localStorage on purpose — a take
  // has to be reproducible with a reload, the same reason "start over"
  // returns to the opening pose.
  const [hintShown, setHintShown] = useState(false);
  const [hintUp, setHintUp] = useState(false);
  useEffect(() => {
    if (hintShown || arcs.length < 2 || baked) return;
    setHintShown(true);
    setHintUp(true);
    const t = setTimeout(() => setHintUp(false), 6500);
    return () => clearTimeout(t);
  }, [arcs.length, baked, hintShown]);

  // --- The bake dissolve. The skin does NOT unmount when `baked` flips; it
  // stays for the length of the reveal, fading, while the lattice sweeps up
  // out of the ground through it. `dissolving` is what keeps it mounted.
  const revealUniforms = useMemo(() => makeRevealUniforms(), []);
  const skinFadeRef = useRef(1);
  const revealProgressRef = useRef(0);
  const [dissolving, setDissolving] = useState(false);
  useEffect(() => {
    if (!baked) {
      setDissolving(false);
      return;
    }
    setDissolving(true);
    // Unmount the skin once it is fully invisible. A timer rather than a
    // per-frame state write: the ref is already driving the pixels, and this
    // only needs to fire once, at the end.
    const t = setTimeout(() => setDissolving(false), (REVEAL_S + 0.1) * 1000);
    return () => clearTimeout(t);
  }, [baked]);

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
  //
  // THE RAIL RE-ARMS HERE, AND THAT IS A FILM-DAY BUG FIX, not tidiness.
  // `hintShown` latches true forever and nothing ever cleared it, so the guidance
  // appeared on the FIRST take of a session and never again — a second take shot
  // without a page reload silently lost it. Daniel takes more than one take. This
  // is the same reason the hint is not persisted to localStorage: a take has to
  // be reproducible, and "reproducible" has to include the second one.
  useEffect(() => {
    if (arcs.length === 0 && !baked) {
      setFraming(HOME);
      setTurntable(false);
      setHintShown(false);
      setHintUp(false);
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
                // "soft" explicitly, not the bare boolean: the shadow's edge is
                // a PCF filter kernel, and which kernel you get is the whole
                // difference between an edge and a smear. Do not assume the
                // boolean resolves to PCFSoft.
                shadows="soft"
                dpr={[1, 2]}
                camera={{ position: [5.6, 3.6, 6.6], fov: 42 }}
                className={`!absolute inset-0 ${cursor}`}
                resize={{ debounce: 0, scroll: false }}
                // Right-drag is the orbit, so the right button must not also
                // summon the browser's menu on top of the shot mid-gesture.
                onContextMenu={(e) => e.preventDefault()}
              >
                <color attach="background" args={['#F6F4EE']} />
                {/* Fog WAS configured and never rendered: near=24 sits beyond
                    everything ever in frame (camera maxDistance 18, object
                    ~9-11 m), so it was paid for and invisible. near=10 starts
                    it past the object's own extent — the lattice must never
                    fog, that reads as a bug — and far=30 lands inside the
                    r=26 ground disc, so its outer edge dissolves into the
                    vellum instead of ending at a hard rim. */}
                <fog attach="fog" args={['#F6F4EE', 10, 30]} />
                {/* THE RIG. Flat fill used to outweigh the key (0.8 ambient +
                    0.7 hemisphere = 1.5 against 1.35), so the shadow the
                    engine already computes never got to read as dark. This is
                    scoped to this Canvas on purpose: HeroScene keeps the house
                    rig. */}
                <ambientLight intensity={0.32} />
                <directionalLight
                  // Raking, ~36° altitude: late-afternoon, and honest — the
                  // repo's own sunpath peaks near 62° at noon, so this is the
                  // shoulder of the day, not an invented angle. Near-overhead
                  // (the old [6,10,5]) kills the shadow's length, which is the
                  // most beautiful thing the lattice has to give.
                  position={[9, 6.5, -3]}
                  intensity={1.9}
                  castShadow
                  shadow-mapSize={[2048, 2048]}
                  // Sized to the object, not to Three's default ±5/far-500.
                  // Same 2048 texels, spent on 11 m instead of scattered over
                  // half a kilometre of empty space: this is most of why the
                  // shadow was a blob.
                  shadow-camera-left={-11}
                  shadow-camera-right={11}
                  shadow-camera-top={11}
                  shadow-camera-bottom={-11}
                  shadow-camera-near={1}
                  shadow-camera-far={26}
                  shadow-bias={-0.0004}
                  shadow-normalBias={0.02}
                />
                {/* Rim: separates timber from vellum and catches member edges.
                    No shadow map, so it costs one light and nothing else. */}
                <directionalLight position={[-7, 4, 6]} intensity={0.35} />
                <hemisphereLight args={['#fbfaf5', '#d8cfae', 0.7]} />
                <StudioEnvironment />

                <DrawStage
                  arcs={arcs}
                  edits={edits}
                  tool={tool}
                  enabled={!baked}
                  // `resolved` retires the lawn and the arcs at bake, but the
                  // SKIN has to outlive it by the length of the dissolve — it
                  // is the thing being dissolved.
                  resolved={baked}
                  keepSkin={dissolving}
                  skinFadeRef={skinFadeRef}
                  spaceHeldRef={spaceHeldRef}
                  onArc={(s) => setArcs((xs) => [...xs, s])}
                  onEdit={(e) => setEdits((xs) => [...xs, e])}
                />

                <BakeReveal
                  active={baked}
                  peakM={peakM}
                  uniforms={revealUniforms}
                  fadeRef={skinFadeRef}
                  progressRef={revealProgressRef}
                />

                {/* The bake: soft surface out, real kit in — and the ground
                    resolves with it. The soft phase keeps its plain green
                    disc deliberately: loose ground invites editing, polished
                    ground stops it, which is the same law that makes bake a
                    resolution rather than a jump-cut. DrawStage's own lawn is
                    gated on !resolved so these two never sit coplanar. */}
                {baked && <Folly revealUniforms={revealUniforms} />}
                {baked && <GardenContext showNorthMarker={false} bedColor="#7d6b52" />}
                {/* A dome renders identically at 3 m and at 30 m. One person
                    and it snaps to human scale. Bake only: see the file. */}
                {baked && <PlacedScaleFigure />}

                {/* TWO passes, doing two different jobs. The wide soft one
                    grounds the whole object in its setting; it is bad at
                    contact, because a blur that wide has no idea where the
                    foot actually meets the earth. The tight one is the
                    ambient-occlusion stand-in: short `far`, small blur, so it
                    only darkens where something is genuinely NEAR the ground.
                    Two render-to-texture passes, no new dependency, no
                    postprocessing pass to go black on the capture machine.

                    Honest limit: this darkens the GROUND under the lattice,
                    never member against member. Real AO would do both. At
                    1440x900 for ten seconds the eye checks ground contact
                    first and never gets to the second read. */}
                <ContactShadows
                  position={[0, 0.015, 0]}
                  opacity={0.24}
                  scale={22}
                  blur={2.6}
                  far={8}
                  color="#5a5443"
                />
                <ContactShadows
                  position={[0, 0.016, 0]}
                  opacity={0.55}
                  scale={5}
                  blur={0.6}
                  far={1.3}
                  color="#4a4436"
                />
                <OrbitControls
                  makeDefault
                  target={[0, 1.0, 0]}
                  minDistance={4}
                  maxDistance={18}
                  minPolarAngle={MIN_POLAR}
                  maxPolarAngle={Math.PI / 2.05}
                  enablePan={false}
                  // THE ORBIT. OrbitControls binds RIGHT to PAN by default, and
                  // pan is off here (deliberately: there is one object and it is
                  // at the origin), so the right button drove a disabled action
                  // and did nothing at all. That, plus DrawStage claiming every
                  // button, is why there was no way to turn the object.
                  // LEFT is ROTATE too; DrawStage takes it back for the tool
                  // unless space is held, so this is the space-hold orbit.
                  mouseButtons={{
                    LEFT: THREE.MOUSE.ROTATE,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.ROTATE,
                  }}
                  // Without damping the view stops dead on pointer-up, which
                  // makes a hand-turned object feel like a stepper motor.
                  enableDamping
                  dampingFactor={0.07}
                  // The turntable yields to the person, instantly and for good.
                  // OrbitControls fires this on the pointer going down, before
                  // any movement, so the object never fights the first drag.
                  //
                  // The rail goes with it: guidance that has been OBEYED should
                  // stop talking. That is `fromDrawing.ts:205-207`'s rule for the
                  // engine's nudges ("an engine that only talks when it overrules
                  // you reads as a validator") applied to chrome — it answers to
                  // being followed, not only to a clock, so a confident take
                  // clears the frame the instant the viewer acts.
                  //
                  // `onStart` and NOT `onChange`: onStart fires only on real
                  // pointer/wheel input, never on the programmatic camera moves
                  // the framing effects make. onChange fires on those too, and
                  // would dismiss the rail before anyone had read it.
                  onStart={() => {
                    setTurntable(false);
                    setHintUp(false);
                  }}
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

            {/* THE GUIDANCE RAIL. How to LOOK at the thing you just made, said
                once, quietly, on the left edge, then never again.

                It is the same hint that used to sit bottom-center, relocated and
                given a second line — not a new mechanism. It deliberately is NOT
                the nudge panel: that is the engine's read of YOUR DRAWING, and it
                only speaks after bake. Operating instructions are neither, and
                folding them in would make one panel speak in two registers and
                arrive too late to help anyone sculpt.

                Both turn paths are named because they are not the same user:
                right-drag is the mouse's, space is the trackpad's, where
                two-finger drag is a wheel event and already means zoom. "Scroll
                to zoom" is direction-agnostic on purpose — it covers in, out, and
                the trackpad pinch that arrives as the same wheel event. */}
            {hintShown && !baked && (
              <div
                className={`pointer-events-none absolute left-4 top-1/2 max-w-[24ch] -translate-y-1/2 space-y-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-inkBlack/40 transition-opacity duration-700 ${
                  hintUp ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {RAIL_LINES.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
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

                <div className="absolute bottom-4 left-4 max-w-[300px] rounded-xl border border-inkBlack/12 bg-paperVellum/85 px-4 py-3 backdrop-blur">
                  {/* SUMMARY COST TO CONSTRUCT, EXPANDABLE. Daniel's ask,
                      2026-07-17: "a summary cost to construct, and then the user
                      can expand it and see their itemized costs."

                      This slot held the computed figure until this morning, when
                      it was dropped for being a price claim no 9px qualifier
                      could scope. It is back, and the reason that is not a
                      reversal is the LABEL: "cost to construct" is a different
                      KIND of claim from "your price". A cost may sit beside a
                      price and differ from it — the difference is the business.
                      What was indefensible was a bare £17,000 in a serif hero
                      reading as what the client pays.

                      The itemisation is the credible half and it is real: every
                      line is built off the actual BOM. Only the MAGNITUDES are
                      pre-quote. */}
                  <div className="flex items-baseline gap-2.5">
                    <p className="font-serif text-[26px] leading-none">
                      £{outputs.price.costBuildUpGBP.toLocaleString()}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-inkBlack/55">
                      {COST_SUMMARY_LABEL}
                    </p>
                  </div>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-inkBlack/45">
                    {PRICE_QUALIFIER} · {priceMetaLine({
                      footprintM2: outputs.geometry.params.footprintM2,
                      feetCount: outputs.geometry.feetCount,
                      pieceCount: outputs.geometry.pieces.length,
                      nodeCount: outputs.geometry.nodes.length,
                    })}
                  </p>

                  <details className="group mt-2">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-inkBlack/50 hover:text-inkBlack">
                      <span className="transition group-open:rotate-90">›</span>
                      <span>{COST_BUILDUP_LABEL}</span>
                    </summary>
                    <div className="mt-2 space-y-1">
                      {outputs.price.lines.map((l) => (
                        <div key={l.label} className="flex justify-between gap-3 text-[10px]">
                          <span className="text-inkBlack/60">{deDash(l.label)}</span>
                          <span className="shrink-0 font-mono tabular-nums text-inkBlack/80">
                            £{l.valueGBP.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <p className="pt-1 text-[9px] leading-relaxed text-inkBlack/45">
                        {COST_BUILDUP_NOTE}
                      </p>
                    </div>
                  </details>

                  {/* Below the rule: STATED, and nothing above the rule moves it.
                      The divider is the whole point — it is what stops the floor
                      reading as another thing the engine just worked out.

                      The two visibly disagree by ~10x. That is deliberate and
                      it is Daniel's to see: a cost of construction is not a
                      commission price, and the gap between them IS the business
                      model. See ui/priceCopy.ts's header for what the gap
                      implies and why no rate was moved to close it. */}
                  <div className="mt-2.5 border-t border-inkBlack/12 pt-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-inkBlack/45">
                      {COMMISSION_LABEL}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] tracking-[0.02em] text-inkBlack/70">
                      {COMMISSION_FROM}{' '}
                      <span className="text-[9px] uppercase tracking-[0.1em] text-inkBlack/45">
                        {COMMISSION_QUALIFIER}
                      </span>
                    </p>
                    <p className="mt-1.5 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-inkBlack/45">
                      {STEWARDSHIP_LABEL} · {STEWARDSHIP_NOTE}
                    </p>
                  </div>
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
                  {/* The two export chips lived here until 2026-07-17. Removed on
                      Daniel's call: "we will have that later." The engine side
                      (`engine/exportProject.ts`) is deliberately KEPT — see its
                      header. Nothing imports it now, so it costs zero bundle. */}
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
