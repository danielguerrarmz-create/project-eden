/**
 * App.tsx — the single-page studio (demo-spec §1).
 *
 * One screen, built to be filmed in one take: the pavilion on its ground
 * plane, four sliders that stop at grammar bounds with visible reasons, a
 * species selector the lattice armature answers to, the year 0/1/2 growth
 * toggle, a live fixed price beside the viewport, and a Commission button
 * that opens the spec sheet + nesting preview. No steps, no accounts, no
 * backend; the design persists as a URL.
 *
 * 2026-07-11 app-like layout: the studio is now a single full-viewport,
 * no-scroll instrument (lg:h-screen / lg:overflow-hidden). A thin top toolbar
 * carries the title; the 3D Scene is the star, a canvas that FLEXES to fill the
 * height between two docked control rails (price + shaping on the left, planting +
 * ecology on the right). Everything is reachable on a 1440×900 laptop with no
 * page scroll. Below lg it stacks and scrolls normally. The Scene, the store, the
 * sliders, pricing, and every behaviour are UNCHANGED — this is layout/chrome only.
 *
 * 2026-07-10 chrome unify: the studio wears the site's documentation-layer
 * language (paperVellum ground, editorial serif headings, hairline + mono labels,
 * olive accent) so it matches the engine and about pages.
 */
import { useState } from 'react';
import { GROWTH } from './data/config';
import { SPECIES } from './engine/species';
import { SplashHeader } from './pages/splash/SplashHeader';
import { Scene } from './scene/Scene';
import { useDesign, shareURL } from './state/store';
import { CommissionSheet } from './ui/CommissionSheet';
import { ParamSlider } from './ui/ParamSlider';
import { PricePanel } from './ui/PricePanel';
import { deDash } from './ui/text';

/** Shared panel + label vocabulary for the documentation-layer studio chrome. */
const PANEL = 'rounded-lg border border-inkBlack/12 bg-white/45 p-4';
const PANEL_TITLE = 'font-mono text-[11px] uppercase tracking-[0.18em] text-inkBlack/50';
const CHIP =
  'rounded-full border border-inkBlack/12 bg-paperVellum/85 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-inkBlack/70 backdrop-blur';

export default function App() {
  return (
    <div className="relative w-full bg-paperVellum text-inkBlack lg:h-[100svh] lg:overflow-hidden">
      {/* The studio wears the SAME header as every other page — no separate studio
          chrome, no title band restating what the screen obviously is. The only
          studio-local addition is the utilities capsule. */}
      <SplashHeader actions={<StudioActions />} />

      {/* The instrument sits below the header and fills the rest of the viewport.
          pt-header is the header's REAL measured height (it publishes --header-h), not a
          guess, so this stays right even when the header wraps to two rows on a phone.
          min-h-0 lets the canvas own the leftover height. */}
      <div className="flex flex-col px-3 pb-3 pt-header lg:h-full">
        <main className="mx-auto grid min-h-0 w-full max-w-canvas flex-1 grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)_300px]">
          <LeftRail />
          <StagePane />
          <RightRail />
        </main>
      </div>

      <CommissionSheet />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Studio utilities — the two page-local actions, in the header's own capsule
// language. `copy link` is the studio's only "send" mechanism: the design IS
// the URL, so the link is the deliverable.
// ---------------------------------------------------------------------------
function StudioActions() {
  const reset = useDesign((s) => s.reset);
  const params = useDesign((s) => s.params);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareURL(params));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be denied in odd embeds; the URL bar already has the link.
      window.prompt('copy this link', shareURL(params));
    }
  };

  return (
    <div data-cursor-solid className="nav-pill flex items-center gap-1 px-2 py-1">
      <button
        onClick={copyLink}
        className="rounded-full px-3 py-1.5 font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-inkBlack transition-colors duration-150 ease-out hover:bg-white/40 focus-visible:bg-white/40"
      >
        {copied ? 'copied' : 'copy link'}
      </button>
      <button
        onClick={reset}
        className="rounded-full px-3 py-1.5 font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-inkBlack/50 transition-colors duration-150 ease-out hover:bg-white/40 hover:text-inkBlack focus-visible:bg-white/40"
      >
        start over
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left rail — the commissioning instruments: live price + Commission, then the
// four shaping sliders with their grammar reasons.
// ---------------------------------------------------------------------------
function LeftRail() {
  return (
    <div className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
      <PricePanel />

      <div className={PANEL}>
        <h2 className={PANEL_TITLE}>Shape it</h2>
        <div className="mt-3 space-y-3">
          <ParamSlider param="footprintM2" />
          <ParamSlider param="riseM" />
          <ParamSlider param="strutSpacingM" />
          <ParamSlider param="apertureDeg" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Centre stage — the pavilion, growth toggle, engine chips. The canvas fills
// the whole cell (Scene is absolute inset-0) so it flexes with the viewport.
// ---------------------------------------------------------------------------
function StagePane() {
  const growth = useDesign((s) => s.outputs.growth);

  return (
    <div className="relative h-[56vh] min-h-[360px] overflow-hidden rounded-lg border border-inkBlack/12 bg-gradient-to-b from-white/50 to-paperDeep/40 shadow-[0_24px_70px_-56px_rgba(23,22,15,0.5)] lg:h-full lg:min-h-0">
      <Scene />

      {/* One quiet growth-stage chip (which of the three years you're seeing). */}
      <div className={`pointer-events-none absolute right-4 top-3 ${CHIP}`}>{deDash(growth.label)}</div>

      <YearToggle />
    </div>
  );
}

function YearToggle() {
  const year = useDesign((s) => s.params.year);
  const setYear = useDesign((s) => s.setYear);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
      <div
        className="flex items-center gap-1 rounded-full border border-inkBlack/12 bg-paperVellum/85 p-1 shadow-sm backdrop-blur"
        role="group"
        aria-label="growth year"
      >
        {GROWTH.years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            aria-pressed={year === y}
            className={`rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition ${
              year === y ? 'bg-inkBlack text-paperVellum' : 'text-inkBlack/55 hover:text-inkBlack'
            }`}
          >
            Year {y}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right rail — the living answer: which plant the armature is tuned for, and
// the ecology the finished Eden yields.
// ---------------------------------------------------------------------------
function RightRail() {
  return (
    <div className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
      <SpeciesPicker />
      <EcologyPanel />
    </div>
  );
}

function SpeciesPicker() {
  const speciesId = useDesign((s) => s.params.speciesId);
  const setSpecies = useDesign((s) => s.setSpecies);

  return (
    <div className={PANEL}>
      <h2 className={PANEL_TITLE}>Plant</h2>
      <p className="mt-1.5 text-[12px] leading-snug text-inkBlack/55">
        Pick your climber. The structure quietly re-tunes for it.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {SPECIES.map((sp) => {
          const active = sp.id === speciesId;
          return (
            <button
              key={sp.id}
              onClick={() => setSpecies(sp.id)}
              aria-pressed={active}
              className={`rounded-lg border px-2.5 py-2 text-left transition ${
                active
                  ? 'border-accentOlive bg-accentOlive/10'
                  : 'border-inkBlack/12 bg-white/40 hover:border-accentOlive/50'
              }`}
            >
              <div
                className={`font-serifDisplay text-[13px] leading-tight ${active ? 'text-inkBlack' : 'text-inkBlack/70'}`}
              >
                {sp.common}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EcologyPanel() {
  const ecology = useDesign((s) => s.outputs.ecology);

  return (
    <div className={PANEL}>
      <h2 className={PANEL_TITLE}>Ecology</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Eco label="habitat" value={`${ecology.habitatAreaM2} m²`} />
        <Eco label="pollinator cells" value={`${ecology.pollinatorCells}`} />
        <Eco label="rainwater / yr" value={`${ecology.rainwaterLitresPerYr.toLocaleString('en-GB')} L`} />
        <Eco label="flowering" value={deDash(ecology.floweringMonths)} />
      </div>
    </div>
  );
}

function Eco({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-inkBlack/12 bg-white/40 px-3 py-2">
      <div className="font-serifDisplay text-[18px] font-semibold leading-none text-inkBlack">{value}</div>
      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/45">{label}</div>
    </div>
  );
}
