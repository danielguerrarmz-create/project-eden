/**
 * DrawPage.tsx — `#/draw`. Two steps: pick your place, then draw it.
 *
 * WHY. The studio opens on four sliders. Four sliders is a Grasshopper
 * definition with better type: the design act collapses into number entry, the
 * tool contributes arithmetic, and nothing about it needs an engine with an
 * opinion or feels like making something.
 *
 * So the input inverts. You start with a PLACE. Then you drag two lines across
 * the lawn — in 3D, in the space the thing will stand in, because a plan view
 * asks people to decode a projection and then believe a dome fell out of it.
 * Each stroke is an arch and its ends are feet. The moment a second one lands,
 * the lattice interpolates between them.
 *
 * The engine READS the lines rather than being configured by them: footprint
 * from the ground the feet enclose, and the OPENING from the widest gap those
 * legs leave over — nobody states an aperture, it is a consequence of where
 * you put the legs. Whatever the grammar fits is said out loud, because an
 * engine that silently snaps your line to its bounds is a slider in a costume.
 *
 * The parameters still exist. They are the ENGINE's interface, not the user's:
 * generateGeometry -> nesting -> pricing runs unchanged underneath.
 *
 * DEMO SCOPE, stated rather than implied: parcels are authored (engine/site.ts)
 * and the lattice between the arches is the real gridshell on the footprint the
 * strokes imply — teaching generateGeometry to honour arbitrary drawn foot
 * bearings is the next engine step. NOT faked: the site analysis, the drawing
 * -> params projection, and the geometry, BOM and price.
 */
import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { SplashHeader } from './splash/SplashHeader';
import { SiteMap, SiteLabels } from './draw/SiteMap';
import { DrawStage } from './draw/DrawStage';
import { Folly } from '../scene/Folly';
import { webglSupported } from '../ui/webgl';
import { analyseSite, type Parcel, type SiteAnalysis } from '../engine/site';
import { readDrawing, type Spine } from '../engine/fromDrawing';
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

export function DrawPage() {
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [spines, setSpines] = useState<Spine[]>([]);

  const site: SiteAnalysis | null = useMemo(
    () => (parcel ? analyseSite(parcel) : null),
    [parcel],
  );

  const drawing = useMemo(() => ({ spines }), [spines]);
  const read = useMemo(() => readDrawing(drawing), [drawing]);

  // One engine, one scene layer, two front doors: push what was drawn into the
  // same store the studio uses, so the SAME Folly draws it.
  const setParams = useDesign((s) => s.setParams);
  const outputs = useDesign((s) => s.outputs);
  useEffect(() => {
    setParams(read.params);
  }, [read.params, setParams]);

  const clearR = site?.placementRadiusM ?? 3.2;
  // Two lines is when it stops being lines and starts being a structure.
  const built = spines.length >= 2;

  return (
    <div className="relative min-h-screen w-full bg-paperVellum text-inkBlack">
      <SplashHeader />

      <div className="relative h-[100svh] w-full overflow-hidden pt-[var(--header-h)]">
        {/* ------------------------------------------------------------------ */}
        {/* The 3D stage is ALWAYS MOUNTED. The site map lays over it until a   */}
        {/* place is picked.                                                    */}
        {/*                                                                     */}
        {/* This is structural, not cosmetic. Mounting the Canvas conditionally */}
        {/* (only after the click) means it mounts into a container already at  */}
        {/* its final size, so R3F's ResizeObserver has no size CHANGE left to  */}
        {/* report. Miss that first delivery — a throttled or backgrounded tab  */}
        {/* doesn't run the rendering steps RO callbacks ride on — and nothing  */}
        {/* ever corrects it: the canvas latches at its 300x150 default and the */}
        {/* scene never appears, permanently, even once you come back. Mounting */}
        {/* with the page is how the studio's Canvas has always avoided this.   */}
        {/* ------------------------------------------------------------------ */}
        <div className="relative h-full w-full p-3">
          <div className="relative h-full w-full overflow-hidden rounded-2xl border border-inkBlack/12">
            {webglSupported() ? (
                <Canvas
                  shadows
                  dpr={[1, 2]}
                  camera={{ position: [7.2, 4.6, 8.4], fov: 40 }}
                  className="!absolute inset-0"
                  resize={{ debounce: 0, scroll: false }}
                >
                  <color attach="background" args={['#F6F4EE']} />
                  <fog attach="fog" args={['#F6F4EE', 22, 52]} />
                  <ambientLight intensity={0.85} />
                  <directionalLight
                    position={[6, 10, 5]}
                    intensity={1.35}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-bias={-0.0002}
                  />
                  <hemisphereLight args={['#fbfaf5', '#d8cfae', 0.7]} />

                  <DrawStage
                    spines={spines}
                    clearRadiusM={clearR}
                    enabled={!!parcel && !built}
                    resolved={built}
                    onSpine={(s) => setSpines((xs) => [...xs, s])}
                  />

                  {/* The interpolation: two lines in, a structure out. */}
                  {built && <Folly />}

                  <ContactShadows
                    position={[0, 0.015, 0]}
                    opacity={0.26}
                    scale={20}
                    blur={2.6}
                    far={7}
                    color="#5a5443"
                  />
                  <OrbitControls
                    makeDefault
                    target={[0, 1.0, 0]}
                    minDistance={4}
                    maxDistance={24}
                    maxPolarAngle={Math.PI / 2.05}
                    enablePan={false}
                  />
                </Canvas>
              ) : (
                <div className="grid h-full place-items-center p-6">
                  <p className="max-w-sm text-center text-sm text-inkBlack/70">
                    The 3D view needs WebGL. Try a current Chrome, Edge, Firefox or Safari.
                  </p>
                </div>
              )}

              {/* STEP 1 — the map, laid OVER the live stage until a place is picked. */}
              {!parcel && (
                <div className="absolute inset-0 bg-[#f1eee4]">
                  <SiteMap selectedId={null} onSelect={setParcel} />
                  <SiteLabels selectedId={null} />
                  <p className="pointer-events-none absolute inset-x-0 top-5 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-inkBlack/60">
                    pick your place
                  </p>
                </div>
              )}

              {/* The only instruction, and it disappears once obeyed. */}
              {parcel && !built && (
                <p className="pointer-events-none absolute inset-x-0 top-5 mx-auto max-w-[40ch] text-center font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-inkBlack/55">
                  {spines.length === 0
                    ? 'drag a line across the lawn'
                    : 'one more, crossing it'}
                </p>
              )}

              {/* What it read. Three lines, only once there's something to say. */}
              {built && (
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
              )}

              {/* The whole readout: one number that matters, three that back it. */}
              {built && (
                <div className="absolute bottom-4 left-4 rounded-xl border border-inkBlack/12 bg-paperVellum/85 px-4 py-3 backdrop-blur">
                  <p className="font-serif text-[26px] leading-none">
                    £{outputs.price.fixedTotalGBP.toLocaleString()}
                  </p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-inkBlack/45">
                    fixed · {outputs.geometry.params.footprintM2.toFixed(1)} m² ·{' '}
                    {outputs.geometry.feetCount} feet · {outputs.geometry.pieces.length} pieces
                  </p>
                </div>
              )}

              {/* Start over / export. Quiet until they're useful. */}
              {parcel && (
              <div className="absolute bottom-4 right-4 flex gap-1.5">
                {spines.length > 0 && (
                  <Chip onClick={() => setSpines((xs) => xs.slice(0, -1))}>undo</Chip>
                )}
                {built && (
                  <>
                    <Chip
                      onClick={() =>
                        download(
                          exportFilename('drawing', site),
                          buildDrawingExport(drawing, 0, site),
                        )
                      }
                    >
                      export drawing
                    </Chip>
                    <Chip
                      onClick={() =>
                        download(
                          exportFilename('project', site),
                          buildProjectExport(drawing, 0, site, read, outputs),
                        )
                      }
                    >
                      export everything
                    </Chip>
                  </>
                )}
                <Chip
                  onClick={() => {
                    setSpines([]);
                    setParcel(null);
                  }}
                >
                  start over
                </Chip>
              </div>
              )}

              {/* The slot Daniel owns. */}
              {parcel && (
                <div className="pointer-events-none absolute right-4 top-4 rounded-xl border border-dashed border-inkBlack/20 px-3 py-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-inkBlack/40">
                    site render · slot
                  </p>
                  <p className="mt-0.5 max-w-[20ch] font-mono text-[9px] leading-snug text-inkBlack/30">
                    splat of your own garden drops in here
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-inkBlack/20 bg-paperVellum/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] backdrop-blur transition hover:border-inkBlack/50"
    >
      {children}
    </button>
  );
}
