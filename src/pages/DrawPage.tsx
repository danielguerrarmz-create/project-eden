/**
 * DrawPage.tsx — `#/draw`. The authoring flow, as a place and a drawing.
 *
 * WHY THIS EXISTS. The studio opens on four sliders. Four sliders is a
 * Grasshopper definition with nicer type: the design act collapses into number
 * entry, and the tool's only contribution is arithmetic. Nothing about it needs
 * an engine with an opinion, and nothing about it feels like making something.
 *
 * This flow inverts it. You start with a PLACE, not a parameter. You draw
 * badly — a loose blob for "about this big", two strokes for "it lands here,
 * here, here and here" — and the engine READS that: area from the blob,
 * ground contacts from the stroke ends, and the opening from the widest gap
 * those legs leave over. You never state an opening. It falls out of where you
 * put the legs. Every fit the grammar makes is spoken aloud as a nudge, because
 * an engine that silently snaps your line to its own bounds is just a slider
 * wearing a costume.
 *
 * The parameters still exist — they are the engine's interface, and the whole
 * tested pipeline downstream (generateGeometry -> pricing) consumes them
 * unchanged. They are just no longer YOUR interface. They appear at the end as
 * a readout of what you drew, not a set of dials you were asked to solve.
 *
 * DEMO SCOPE, stated plainly: the parcels are authored (engine/site.ts), the
 * flow is linear, and the sculpt step offers one move (pull the crown). The
 * Gaussian-splat site render is a placeholder slot. What is NOT faked: the
 * site analysis, the drawing -> params projection, and the geometry, BOM and
 * price, which are the real engine end to end.
 */
import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { SplashHeader } from './splash/SplashHeader';
import { SiteMap, SiteLabels } from './draw/SiteMap';
import { PlanCanvas } from './draw/PlanCanvas';
import { Folly } from '../scene/Folly';
import { GardenContext } from '../scene/GardenContext';
import { webglSupported } from '../ui/webgl';
import { analyseSite, maxFootprintForRadius, type Parcel, type SiteAnalysis } from '../engine/site';
import { readDrawing, type Pt, type Spine } from '../engine/fromDrawing';
import { useDesign } from '../state/store';

type Step = 'site' | 'trace' | 'spines' | 'form';

const STEPS: { id: Step; n: string; label: string }[] = [
  { id: 'site', n: '01', label: 'your place' },
  { id: 'trace', n: '02', label: 'about this big' },
  { id: 'spines', n: '03', label: 'it lands here' },
  { id: 'form', n: '04', label: 'what that built' },
];

export function DrawPage() {
  const [step, setStep] = useState<Step>('site');
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [outline, setOutline] = useState<Pt[]>([]);
  const [spines, setSpines] = useState<Spine[]>([]);
  const [crownPullM, setCrownPullM] = useState(0);

  const site: SiteAnalysis | null = useMemo(
    () => (parcel ? analyseSite(parcel) : null),
    [parcel],
  );

  const read = useMemo(
    () => readDrawing({ outline, spines, crownPullM }),
    [outline, spines, crownPullM],
  );

  // Push what was drawn into the shared design store, so the SAME Folly the
  // studio renders draws it — one scene layer, one engine, two front doors.
  const setParams = useDesign((s) => s.setParams);
  const outputs = useDesign((s) => s.outputs);
  useEffect(() => {
    setParams(read.params);
  }, [read.params, setParams]);

  const clearR = site?.placementRadiusM ?? 3;
  const roomCapM2 = site ? maxFootprintForRadius(site.placementRadiusM) : Infinity;
  const overRoom = site !== null && read.params.footprintM2 > roomCapM2;

  const canAdvance =
    (step === 'site' && parcel !== null) ||
    (step === 'trace' && outline.length >= 3) ||
    (step === 'spines' && spines.length >= 1) ||
    step === 'form';

  const next = () => {
    const i = STEPS.findIndex((s) => s.id === step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1].id);
  };

  return (
    <div className="relative min-h-screen w-full bg-paperVellum text-inkBlack">
      <SplashHeader />

      <div className="relative flex h-[100svh] w-full flex-col overflow-hidden pt-[var(--header-h)]">
        {/* Step rail */}
        <div className="flex shrink-0 items-center justify-center gap-1 px-gutter pt-3">
          {STEPS.map((s, i) => {
            const active = s.id === step;
            const done = STEPS.findIndex((x) => x.id === step) > i;
            return (
              <button
                key={s.id}
                onClick={() => (done || active) && setStep(s.id)}
                disabled={!done && !active}
                className={`flex items-baseline gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition ${
                  active
                    ? 'border-inkBlack/60 bg-inkBlack text-paperVellum'
                    : done
                      ? 'border-inkBlack/25 text-inkBlack/70 hover:border-inkBlack/50'
                      : 'border-inkBlack/12 text-inkBlack/30'
                }`}
              >
                <span className="opacity-60">{s.n}</span>
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[1fr_320px]">
          {/* Stage */}
          <div className="relative min-h-0 overflow-hidden rounded-2xl border border-inkBlack/12 bg-[#f1eee4]">
            {step === 'site' && (
              <>
                <SiteMap selectedId={parcel?.id ?? null} onSelect={setParcel} />
                <SiteLabels selectedId={parcel?.id ?? null} />
                {!parcel && (
                  <p className="pointer-events-none absolute inset-x-0 top-4 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/60">
                    pick your property
                  </p>
                )}
              </>
            )}

            {(step === 'trace' || step === 'spines') && (
              <>
                <PlanCanvas
                  mode={step === 'trace' ? 'trace' : 'spines'}
                  outline={outline}
                  spines={spines}
                  clearRadiusM={clearR}
                  onOutline={setOutline}
                  onSpine={(s) => setSpines((xs) => [...xs, s])}
                />
                <p className="pointer-events-none absolute inset-x-0 top-4 mx-auto max-w-[46ch] text-center font-mono text-[11px] uppercase leading-relaxed tracking-[0.13em] text-inkBlack/60">
                  {step === 'trace'
                    ? 'scribble roughly how much ground it covers. badly is fine.'
                    : 'drag a stroke from one foot to another. two strokes, four feet.'}
                </p>
                <div className="absolute bottom-3 left-3 flex gap-1.5">
                  <button
                    onClick={() => (step === 'trace' ? setOutline([]) : setSpines([]))}
                    className="rounded-md border border-inkBlack/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] hover:border-inkBlack/45"
                  >
                    clear
                  </button>
                  {step === 'spines' && spines.length > 0 && (
                    <button
                      onClick={() => setSpines((xs) => xs.slice(0, -1))}
                      className="rounded-md border border-inkBlack/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] hover:border-inkBlack/45"
                    >
                      undo
                    </button>
                  )}
                </div>
              </>
            )}

            {step === 'form' && (
              <>
                {webglSupported() ? (
                  <Canvas
                    shadows
                    dpr={[1, 2]}
                    camera={{ position: [6.4, 3.4, 7.2], fov: 42 }}
                    className="!absolute inset-0"
                  >
                    <color attach="background" args={['#F6F4EE']} />
                    <fog attach="fog" args={['#F6F4EE', 20, 46]} />
                    <ambientLight intensity={0.85} />
                    <directionalLight
                      position={[6, 10, 5]}
                      intensity={1.35}
                      castShadow
                      shadow-mapSize={[2048, 2048]}
                      shadow-bias={-0.0002}
                    />
                    <hemisphereLight args={['#fbfaf5', '#d8cfae', 0.7]} />
                    <GardenContext />
                    <Folly />
                    <ContactShadows
                      position={[0, 0.015, 0]}
                      opacity={0.28}
                      scale={18}
                      blur={2.6}
                      far={7}
                      color="#5a5443"
                    />
                    <OrbitControls
                      makeDefault
                      target={[0, 1.1, 0]}
                      minDistance={4}
                      maxDistance={22}
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

                {/* The one sculpt move, on purpose: pull the crown. */}
                <div className="absolute bottom-3 left-3 w-[228px] rounded-xl border border-inkBlack/15 bg-paperVellum/85 px-3 py-2 backdrop-blur">
                  <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-inkBlack/55">
                    pull the crown
                  </p>
                  <input
                    type="range"
                    min={-0.4}
                    max={0.6}
                    step={0.01}
                    value={crownPullM}
                    onChange={(e) => setCrownPullM(Number(e.target.value))}
                    className="w-full accent-[#7d8e5b]"
                  />
                  <p className="mt-1 font-mono text-[9px] leading-snug text-inkBlack/50">
                    {read.params.riseM.toFixed(2)} m tall
                  </p>
                </div>

                {/* The placeholder Daniel owns: the splat of the real garden. */}
                <div className="absolute right-3 top-3 rounded-xl border border-dashed border-inkBlack/25 px-3 py-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-inkBlack/45">
                    site render · slot
                  </p>
                  <p className="mt-0.5 max-w-[22ch] font-mono text-[9px] leading-snug text-inkBlack/35">
                    Gaussian splat of your own garden drops in here. Optional.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Panel */}
          <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
            {step === 'site' && (
              <Card title={site ? 'what we found' : 'the yard, first'}>
                {!site ? (
                  <p className="text-[12px] leading-relaxed text-inkBlack/65">
                    An Eden goes in a real garden with a real fence, a real setback and
                    sometimes a tree the city protects. So we start there, not with sliders.
                  </p>
                ) : (
                  <>
                    <Stat label="back yard" value={`${site.backyardAreaM2.toFixed(0)} m²`} />
                    <Stat label="roomiest spot" value={`${site.placementRadiusM.toFixed(1)} m clear`} />
                    <Stat label="fits up to" value={`${Math.min(18, maxFootprintForRadius(site.placementRadiusM)).toFixed(0)} m²`} />
                    <ul className="mt-2 space-y-1.5 border-t border-inkBlack/12 pt-2">
                      {site.reasons.map((r, i) => (
                        <li key={i} className="font-mono text-[9px] leading-snug text-inkBlack/55">
                          {r}
                        </li>
                      ))}
                    </ul>
                    {site.warnings.map((w, i) => (
                      <p key={i} className="mt-2 border-t border-inkBlack/12 pt-2 font-mono text-[9px] leading-snug text-[#b8402f]">
                        {w}
                      </p>
                    ))}
                  </>
                )}
              </Card>
            )}

            {step !== 'site' && (
              <>
                <Card title="what the engine read">
                  {read.nudges.length === 0 ? (
                    <p className="text-[12px] leading-relaxed text-inkBlack/55">
                      Nothing yet. Draw something and it'll tell you what it made of it.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {read.nudges.map((n, i) => (
                        <li key={i} className="flex gap-2">
                          <span
                            className={`mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full ${
                              n.kind === 'held'
                                ? 'bg-[#b8402f]'
                                : n.kind === 'offered'
                                  ? 'bg-[#7d8e5b]'
                                  : 'bg-inkBlack/35'
                            }`}
                          />
                          <span className="text-[11px] leading-snug text-inkBlack/70">{n.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {overRoom && (
                    <p className="mt-2 border-t border-inkBlack/12 pt-2 font-mono text-[9px] leading-snug text-[#b8402f]">
                      That's bigger than the {roomCapM2.toFixed(0)} m² your roomiest spot actually
                      holds. It'll still build — it just won't fit there.
                    </p>
                  )}
                </Card>

                {step === 'form' && (
                  <>
                    <Card title="your price, fixed">
                      <p className="font-serif text-[30px] leading-none">
                        £{outputs.price.fixedTotalGBP.toLocaleString()}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-inkBlack/55">
                        one figure, held: fabrication, install, groundwork and planting
                      </p>
                    </Card>
                    <Card title="what that built">
                      <Stat label="footprint" value={`${read.params.footprintM2.toFixed(1)} m²`} />
                      <Stat label="rise" value={`${read.params.riseM.toFixed(2)} m`} />
                      <Stat label="opening" value={`${read.params.apertureDeg}°`} />
                      <Stat label="feet" value={String(outputs.geometry.feetCount)} />
                      <Stat label="pieces" value={String(outputs.geometry.pieces.length)} />
                      <Stat label="ground screws" value={String(outputs.geometry.groundScrewCount)} />
                      <p className="mt-2 border-t border-inkBlack/12 pt-2 font-mono text-[9px] leading-snug text-inkBlack/45">
                        These are the engine's parameters, not your interface. You drew; this is
                        what it read. Every number here is the same pipeline the studio prices.
                      </p>
                    </Card>
                  </>
                )}
              </>
            )}

            {step !== 'form' && (
              <button
                onClick={next}
                disabled={!canAdvance}
                className={`mt-auto shrink-0 rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] transition ${
                  canAdvance
                    ? 'bg-inkBlack text-paperVellum hover:opacity-90'
                    : 'cursor-not-allowed bg-inkBlack/10 text-inkBlack/30'
                }`}
              >
                {step === 'site' ? 'draw it' : step === 'trace' ? 'now the spines' : 'build it'}
              </button>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="shrink-0 rounded-2xl border border-inkBlack/12 bg-paperVellum/80 px-4 py-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/55">
        {title}
      </p>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-inkBlack/45">
        {label}
      </span>
      <span className="font-mono text-[12px] text-inkBlack/85">{value}</span>
    </div>
  );
}
