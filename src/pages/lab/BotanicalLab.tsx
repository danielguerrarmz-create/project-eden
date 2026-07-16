/**
 * BotanicalLab.tsx — ISOLATED preview for the procedural botanical generator
 * (#/lab/botanical). Phase-1 review artifact ONLY: nothing here is wired into the
 * About timeline, splash, or engine. It renders a grid of generated plants —
 * named species presets and fully-random "wild" seeds — on the paperVellum
 * ground in INK_BLUE, so Daniel can judge the look before any substitution.
 *
 * The generator is pure/deterministic; a "reseed" button just bumps a salt that
 * changes the per-cell seeds. No engine or site behaviour is touched.
 */
import { useMemo, useState } from 'react';
import { SplashHeader } from '../splash/SplashHeader';
import {
  growPlant,
  growWild,
  INK_BLUE,
  SPECIES_PRESETS,
  type PlantDrawing,
} from '../../engine/botanical';

/** A single plant, drawn to fill its cell with a little breathing room. */
function PlantCell({ plant, label }: { plant: PlantDrawing; label: string }) {
  return (
    <figure className="flex flex-col items-center rounded-lg border border-inkBlack/10 bg-white/40 p-3">
      <svg
        viewBox={plant.viewBox}
        className="h-64 w-full"
        preserveAspectRatio="xMidYMax meet"
        role="img"
        aria-label={`Generated plant: ${label}`}
      >
        {plant.paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.strokeWidth}
            fill={p.fill}
            fillOpacity={p.fillOpacity}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <figcaption className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/55">
        {label}
      </figcaption>
    </figure>
  );
}

export function BotanicalLab() {
  const [salt, setSalt] = useState(0);
  const [wildCount, setWildCount] = useState(12);

  const presetPlants = useMemo(
    () =>
      SPECIES_PRESETS.flatMap((preset) =>
        [0, 1, 2].map((k) => ({
          key: `${preset.name}-${k}-${salt}`,
          label: `${preset.name} · ${k}`,
          plant: growPlant(preset, `${preset.name}-${k}-${salt}`),
        })),
      ),
    [salt],
  );

  const wildPlants = useMemo(
    () =>
      Array.from({ length: wildCount }, (_, i) => {
        const seed = `wild-${i}-${salt}`;
        const plant = growWild(seed);
        return { key: seed, label: `wild · ${i}`, plant };
      }),
    [salt, wildCount],
  );

  return (
    <div className="min-h-[100svh] bg-paperVellum text-inkBlack">
      <SplashHeader />
      <main className="mx-auto w-full max-w-canvas px-4 pb-24 pt-header">
        <header className="border-b border-inkBlack/12 pb-4 pt-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-inkBlack/50">
            Lab · Phase 1 preview (not wired in)
          </p>
          <h1 className="mt-2 font-serifDisplay text-[clamp(1.5rem,4vw,2.6rem)] font-medium leading-[1.12]">
            Procedural botany, single-colour vector ink
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-inkBlack/70">
            Forms adapted from{' '}
            <a
              className="underline underline-offset-2"
              href="https://github.com/LingDong-/nonflowers"
              target="_blank"
              rel="noreferrer"
            >
              nonflowers
            </a>{' '}
            (Lingdong Huang, MIT) — its seed-driven genome and noise-wandered
            stems/leaves/flowers — re-expressed as deterministic{' '}
            <span style={{ color: INK_BLUE }}>INK_BLUE</span> SVG paths. Each plant
            is reproducible from its seed.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSalt((s) => s + 1)}
              className="rounded-full border border-inkBlack/20 bg-white/60 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-inkBlack/75 transition hover:bg-white"
            >
              Reseed
            </button>
            <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-inkBlack/55">
              Wild count
              <input
                type="range"
                min={4}
                max={30}
                value={wildCount}
                onChange={(e) => setWildCount(Number(e.target.value))}
              />
              <span className="tabular-nums text-inkBlack/75">{wildCount}</span>
            </label>
          </div>
        </header>

        <section className="mt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-inkBlack/50">
            Named species presets (3 seeds each)
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {presetPlants.map((p) => (
              <PlantCell key={p.key} plant={p.plant} label={p.label} />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-inkBlack/50">
            Wild genomes (fully randomized per seed)
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {wildPlants.map((p) => (
              <PlantCell key={p.key} plant={p.plant} label={p.label} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
