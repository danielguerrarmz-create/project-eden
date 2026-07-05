/**
 * EnginePage.tsx — the Generative Engine explainer (Eden documentation layer).
 *
 * PLACEHOLDER. This is the foundation stub that proves the token + font + routing
 * layer works end to end; the real editorial page (field sections, hairline
 * engine diagrams) is built from Sai's ENGINE-PAGE-SPEC.md in a follow-up.
 *
 * Everything here is the documentation layer, NOT the configurator: field colors,
 * editorial serif, hairline mono annotation. No moss/bloom, no configurator paper.
 */
import { routes } from '../routing';

export function EnginePage() {
  return (
    <div className="min-h-screen w-full bg-fieldBlue text-inkNavy">
      {/* Quiet top bar: mono wordmark + a real anchor back to the tool. */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-inkNavy/80">
          living eden · the engine
        </span>
        <a
          href={routes.configurator}
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-inkNavy underline decoration-inkNavy/40 underline-offset-4 hover:decoration-inkNavy focus-visible:decoration-inkNavy"
        >
          back to the configurator
        </a>
      </header>

      <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-6 py-16 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accentOlive">
          how it works
        </p>
        <h1 className="mt-4 font-serifDisplay text-[clamp(2.75rem,6vw,5.5rem)] font-bold leading-[0.98] tracking-[-0.02em]">
          A structure that finishes <em className="italic">itself</em>
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-inkNavy/90">
          The engine reads your plot and the sun, then resolves a buildable timber
          lattice for the plant you choose. This page will show how, in hairline.
        </p>
        <p className="mt-10 font-quote text-[15px] italic text-inkNavy/70">
          Foundation stub. The full explainer lands next.
        </p>
      </main>
    </div>
  );
}
