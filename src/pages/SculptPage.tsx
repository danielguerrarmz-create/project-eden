/**
 * SculptPage.tsx — the form-finding SPIKE route (`#/sculpt`).
 *
 * A de-risking prototype for the Bower / Eden bet: SCULPT the pavilion instead of
 * setting parameters. Grab a lattice node and pull; a position-based relaxation
 * (engine/formFinding) projects the deformed lattice back onto the nearest
 * BUILDABLE gridshell every frame. The shell visibly settles as you pull and
 * stiffens at the fabrication limits — "clay with a grain".
 *
 * This runs ALONGSIDE the existing param engine (#/shape, #/studio) — it does not
 * touch the store or the four-param model. Self-contained Canvas + solver so the
 * spike stays isolated and reviewable. The HUD makes buildability + perf visible:
 * node/strut counts, live fps, out-of-spec struts (must stay 0), strut length range.
 */
import { useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { webglSupported } from '../ui/webgl';
import { SplashHeader } from './splash/SplashHeader';
import { SculptShell } from '../scene/SculptShell';
import { FAB_MIN_M, FAB_MAX_M, type ShellStats } from '../engine/formFinding';

/**
 * Density presets. The first three are BUILDABLE (out-of-spec holds at 0). The
 * naive polar grid converges toward the crown, so past ~170 nodes the crown-ring
 * struts fall below the fab minimum — 'perf' deliberately crosses that ceiling to
 * show it: the solver stays real-time but buildability breaks (topology, not the
 * solver, is the production risk — see the plan doc). Oculus scales with spokes to
 * keep the crown ring buildable as long as the grid can.
 */
const DENSITY = [
  { label: 'coarse', spokes: 14, rings: 5, oculus: 0.43, buildable: true },
  { label: 'default', spokes: 18, rings: 6, oculus: 0.43, buildable: true },
  { label: 'fine', spokes: 28, rings: 5, oculus: 0.65, buildable: true },
  { label: 'perf', spokes: 40, rings: 14, oculus: 0.6, buildable: false },
] as const;

export function SculptPage() {
  const [level, setLevel] = useState(1);
  const [radius, setRadius] = useState(1.1);
  const [resetNonce, setResetNonce] = useState(0);
  const [stats, setStats] = useState<ShellStats | null>(null);
  const [fps, setFps] = useState(60);

  const onStats = useCallback((s: ShellStats, f: number) => {
    setStats(s);
    setFps(f);
  }, []);

  const d = DENSITY[level];
  const outOfSpec = stats?.outOfSpec ?? 0;

  return (
    <div className="relative min-h-screen w-full bg-paperVellum text-inkBlack">
      <SplashHeader />

      <div className="relative h-[100svh] w-full overflow-hidden">
        {webglSupported() ? (
          <Canvas shadows dpr={[1, 2]} camera={{ position: [5.8, 3.6, 6.6], fov: 44 }} className="!absolute inset-0">
            <color attach="background" args={['#F6F4EE']} />
            <fog attach="fog" args={['#F6F4EE', 18, 42]} />
            <ambientLight intensity={0.85} />
            <directionalLight position={[6, 10, 5]} intensity={1.3} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} />
            <hemisphereLight args={['#fbfaf5', '#d8cfae', 0.7]} />

            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <circleGeometry args={[24, 48]} />
              <meshStandardMaterial color="#e7e1d1" roughness={1} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[6.5, 48]} />
              <meshStandardMaterial color="#8ea060" roughness={1} />
            </mesh>

            <SculptShell
              spokes={d.spokes}
              rings={d.rings}
              oculus={d.oculus}
              radius={radius}
              onStats={onStats}
              resetNonce={resetNonce}
            />

            <ContactShadows position={[0, 0.012, 0]} opacity={0.28} scale={16} blur={2.6} far={7} color="#5a5443" />
            <OrbitControls makeDefault target={[0, 1.1, 0]} minDistance={4} maxDistance={20} maxPolarAngle={Math.PI / 2.05} enablePan={false} />
          </Canvas>
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6">
            <p className="max-w-sm text-center text-sm text-inkBlack/70">
              The sculpt spike needs WebGL. Try a current Chrome, Edge, Firefox or Safari.
            </p>
          </div>
        )}

        {/* Instruction */}
        <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center px-6">
          <p className="max-w-[58ch] text-center font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-inkBlack/70">
            Spike · grab a node and pull. The lattice relaxes onto the nearest buildable gridshell
            and stiffens at the fabrication limits.
          </p>
        </div>

        {/* Live buildability + perf readout, bottom-left. */}
        <div className="absolute bottom-6 left-6 w-[264px] rounded-2xl border border-inkBlack/15 bg-paperVellum/85 px-4 py-3 backdrop-blur">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/55">
            form-finding · live
          </p>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5">
            <Stat label="nodes" value={stats ? String(stats.nodes) : '—'} />
            <Stat label="struts" value={stats ? String(stats.struts) : '—'} />
            <Stat label="fps" value={String(Math.round(fps))} warn={fps < 30} />
            <Stat label="out of spec" value={String(outOfSpec)} warn={outOfSpec > 0} />
            <Stat label="min strut" value={stats ? `${stats.minLen.toFixed(2)} m` : '—'} />
            <Stat label="max strut" value={stats ? `${stats.maxLen.toFixed(2)} m` : '—'} />
          </dl>
          <p className="mt-2.5 border-t border-inkBlack/12 pt-2 font-mono text-[9px] leading-snug tracking-[0.02em] text-inkBlack/55">
            fab limits {FAB_MIN_M.toFixed(2)}–{FAB_MAX_M.toFixed(2)} m · every strut clamped inside,
            live. out of spec {outOfSpec === 0 ? 'holds at 0' : 'BREACHED'}.
          </p>
        </div>

        {/* Controls, bottom-right. */}
        <div className="absolute bottom-6 right-6 w-[264px] rounded-2xl border border-inkBlack/15 bg-paperVellum/85 px-4 py-3 backdrop-blur">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/55">density · grab</p>

          <div className="flex flex-wrap gap-1.5">
            {DENSITY.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => setLevel(i)}
                className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] transition ${
                  i === level ? 'border-inkBlack/60 bg-inkBlack/5' : 'border-inkBlack/20 hover:border-inkBlack/45'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="mt-3 flex items-center gap-2">
            <span className="w-16 font-mono text-[10px] uppercase tracking-[0.12em] text-inkBlack/55">falloff</span>
            <input
              type="range"
              min={0.4}
              max={2.4}
              step={0.1}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="flex-1 accent-accentOlive"
            />
            <span className="w-10 text-right font-mono text-[11px] tabular-nums text-inkBlack/80">{radius.toFixed(1)}m</span>
          </label>

          <button
            onClick={() => setResetNonce((n) => n + 1)}
            className="mt-3 w-full rounded-md border border-inkBlack/20 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition hover:border-inkBlack/50"
          >
            reset shell
          </button>

          <a
            href="#/shape"
            className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.14em] underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-accentOlive"
          >
            the param prototype →
          </a>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-inkBlack/50">{label}</dt>
      <dd className={`font-mono text-[13px] tabular-nums tracking-[0.02em] ${warn ? 'text-[#b8402f]' : 'text-inkBlack/90'}`}>
        {value}
      </dd>
    </div>
  );
}
