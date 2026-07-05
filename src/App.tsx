/**
 * App.tsx — the guided 3-step commissioner (v2 surface).
 *
 * One decision surface visible at a time: SITE (map your plot) -> DESIGN (three
 * choices) -> GROW (animated preview + commission). A floating pill navbar with a
 * slim progress marker floats over every step. The engine underneath is unchanged;
 * this file only orchestrates which step is on screen. Warm paper, botanical
 * accents, no blue.
 */
import { useDesign } from './state/store';
import { Navbar } from './ui/Navbar';
import { StepSite } from './steps/StepSite';
import { StepDesign } from './steps/StepDesign';
import { StepPreview } from './steps/StepPreview';

export default function App() {
  const step = useDesign((s) => s.step);

  return (
    <div className="relative min-h-screen w-full bg-paperVellum text-inkBlack">
      {/* Quiet tendril motif at the page edge, a faint neutral line drawing */}
      <Tendril />

      <Navbar />

      <main className="relative z-10">
        {step === 1 && <StepSite />}
        {step === 2 && <StepDesign />}
        {step === 3 && <StepPreview />}
      </main>
    </div>
  );
}

/** A thin hand-drawn tendril curling up the left edge. Pure decoration, quiet. */
function Tendril() {
  return (
    <svg
      className="pointer-events-none fixed bottom-0 left-0 z-0 h-[60vh] w-40 opacity-[0.14]"
      viewBox="0 0 120 400"
      fill="none"
      aria-hidden
    >
      <path
        d="M20 400 C 20 320, 60 300, 50 240 S 10 180, 40 130 S 80 90, 55 40"
        stroke="#17160F"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M50 240 C 70 235, 82 248, 78 262" stroke="#17160F" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M40 130 C 22 126, 12 138, 16 152" stroke="#17160F" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="55" cy="40" r="3" fill="#17160F" />
      <ellipse cx="78" cy="262" rx="6" ry="3" fill="#17160F" transform="rotate(30 78 262)" />
      <ellipse cx="16" cy="152" rx="6" ry="3" fill="#17160F" transform="rotate(-30 16 152)" />
    </svg>
  );
}
