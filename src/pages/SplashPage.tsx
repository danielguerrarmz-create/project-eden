/**
 * SplashPage.tsx — the home (`#/`), the full-bleed editorial landing.
 *
 * REDUCED 2026-07-17 (round 11, Daniel): the home was cut to the shortest path that
 * explains the product. It is now HERO -> what Bower is -> what happens after you shape
 * it -> begin -> monument. The "keeps becoming" three-season band and the "habitat built
 * in" ecology band were cut, and the pipeline / envelope / strut-field diagrams with them;
 * the full six-section engine walkthrough still lives at `/engine`, reached by the link in
 * the first band, so nothing is lost, only moved off the front door.
 *
 * The two product photographs (exterior in the garden, and the oculus from within) carry
 * the two middle bands as an alternating split: photo left / text right, then text left /
 * photo right, matching the format Daniel marked up. Each image is its own picture at its
 * own ratio (both 1.34) under the "stop forcing geometry onto something that already knows
 * its shape" rule (CLAUDE.md): no fixed-aspect box, no object-fit, no crop.
 *
 * It still reads the live default design (the store initializes outputs eagerly), so the
 * one production figure shown in the second band (components, lead time) is real engine
 * output, not a written number.
 *
 * Copy note: no em/en dashes anywhere in this page's hand-authored copy.
 */
import { useDesign } from '../state/store';
import { useReducedMotion } from '../ui/useReducedMotion';
import { routes } from '../routing';
import { AnnotationStrip, EngineSection, Eyebrow } from './engine/EngineSection';
import { HeroReveal } from './splash/HeroReveal';
import { SplashHeader } from './splash/SplashHeader';
import { AdaptiveCursor } from './splash/AdaptiveCursor';
import { BowerIntro } from './splash/BowerIntro';
import { RegisterInterest } from './splash/RegisterInterest';
import { ritualSteps } from './splash/copy';
import { H2, BODY } from './typeScale';

export function SplashPage() {
  const reduced = useReducedMotion();
  const outputs = useDesign((s) => s.outputs);
  const { components, buildPlan } = outputs;

  return (
    <div className="min-h-screen w-full">
      {/* Adaptive blend-difference cursor for the home page. Self-gates to fine
          pointer + motion-allowed; renders nothing (native cursor) otherwise. */}
      <AdaptiveCursor />

      {/* The "bower" intro: assembles center-screen, flies to the nav wordmark.
          Runs once per tab; reduced-motion / already-played render nothing. */}
      <BowerIntro />

      {/* Global nav: fixed, frozen at the top for the whole scroll session. Holds the
          single [data-wordmark] the intro hands the "bower" lockup onto. */}
      <SplashHeader />

      {/* 1 — HERO: the scroll-scrubbed 2D Oculus -> 3D gridshell -> render reveal */}
      <HeroReveal outputs={outputs} reduced={reduced} />

      {/* 2 — WHAT BOWER IS (vellum, #how-it-works). PHOTO LEFT / TEXT RIGHT.
          The product said once, plainly, beside the built thing. The photo replaces the
          pipeline + envelope diagrams that used to carry this band; the depth they held
          now lives one link away at /engine. */}
      <EngineSection ground="vellum" reduced={reduced} id="how-it-works" wide>
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <figure className="order-1">
            <img
              src="/assets/product/pavilion-exterior-garden.webp"
              alt="A woven timber gridshell pavilion in a garden, its open oculus at the crown, wisteria and green planting grown through the lattice, a bed of wildflowers in front"
              loading="lazy"
              decoding="async"
              className="block h-auto w-full"
            />
          </figure>

          <div className="order-2">
            <Eyebrow>What Bower is</Eyebrow>
            <h2 className={`mt-4 ${H2}`}>
              Not a catalogue of shapes to choose from. A grammar computes the{' '}
              <em className="italic">one</em> that's yours.
            </h2>
            <p className={BODY}>
              Bower is a generative design studio. An engine computes a one of a kind timber
              structure for your garden, priced and buildable as you shape it, that a climber grows
              into season after season.
            </p>
            <a
              href={routes.engine}
              className="mt-8 inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-accentOlive focus-visible:decoration-accentOlive"
            >
              See the full engine walkthrough →
            </a>
          </div>
        </div>
      </EngineSection>

      {/* 3 — WHAT HAPPENS AFTER YOU SHAPE IT (blue). TEXT LEFT / PHOTO RIGHT.
          The whole process in five lines, beside the oculus from within. The annotation is
          the one live production figure kept on the front door. */}
      <EngineSection ground="blue" reduced={reduced} wide>
        <div className="grid items-start gap-10 md:grid-cols-2 md:gap-16">
          <div className="order-2 md:order-1">
            <h2 className={H2}>
              What actually <em className="italic">happens</em> after you shape it.
            </h2>
            <p className={BODY}>
              You shape it, we cut it, you plant it, and that's genuinely the whole of it.
            </p>

            <ol className="mt-8 max-w-[560px]">
              {ritualSteps().map((step) => (
                <li
                  key={step.n}
                  className="flex gap-5 border-t border-inkNavy/15 py-4 first:border-t-0 sm:py-5"
                >
                  <span className="pt-[3px] font-mono text-[12px] tabular-nums opacity-50">
                    {step.n}
                  </span>
                  <span className="text-[16px] leading-snug sm:text-[17px]">{step.text}</span>
                </li>
              ))}
            </ol>

            <AnnotationStrip>
              this design: ~{components.totalCount} components · ~{buildPlan.leadTimeWeeks} wks
            </AnnotationStrip>
          </div>

          <figure className="order-1 md:order-2">
            <img
              src="/assets/product/pavilion-oculus-interior.webp"
              alt="Looking up inside a woven timber gridshell at its open oculus, the lattice converging on the ring with wisteria hanging through it"
              loading="lazy"
              decoding="async"
              className="block h-auto w-full"
            />
          </figure>
        </div>
      </EngineSection>

      {/* 4 — CLOSE (vellum, #register): the low-commitment register, then quiet real doors so
          no reader (buyer, advisor, investor) dead-ends. Each door is a working link. */}
      <EngineSection ground="vellum" reduced={reduced} id="register">
        <h2 className={H2}>
          <em className="italic">Begin.</em>
        </h2>
        <p className={BODY}>
          These are the first Edens, and yours could be among them. Put your name down, which takes
          about ten seconds, or find your way in below.
        </p>

        <RegisterInterest />

        <div className="mt-12 grid gap-x-10 gap-y-6 border-t border-inkBlack/15 pt-8 sm:grid-cols-2">
          <Door label="Commission one" href={routes.studio} note="Shape it in the studio." />
          <Door label="Who is behind this" href={routes.about} note="The people building Bower." />
        </div>
      </EngineSection>

      {/* Company monument: Bower is the company, Eden its one product. One quiet,
          viewport-wide lowercase wordmark closes the page. */}
      <footer className="w-full overflow-hidden bg-paperVellum pb-16">
        <div className="mx-auto w-full max-w-read border-t border-inkBlack/15 px-gutter pt-8">
          <p className="whitespace-nowrap font-serifDisplay font-semibold lowercase leading-none tracking-[-0.03em] text-inkBlack text-[clamp(4rem,20vw,14rem)]">
            bower
          </p>
        </div>
      </footer>
    </div>
  );
}

/** One "door" in the close: a labelled way in (buyer, advisor, investor), each a real link.
 *  A left-origin olive underline grows on hover, matching the nav's quiet motion register. */
function Door({ label, href, note }: { label: string; href: string; note: string }) {
  return (
    <a href={href} className="group block">
      <span className="font-serifDisplay text-[19px] leading-tight text-inkBlack">
        {label}
        <span className="ml-1.5 inline-block text-accentOlive transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      </span>
      <span className="mt-1 block font-mono text-[11px] leading-relaxed tracking-[0.04em] text-inkBlack/50">
        {note}
      </span>
    </a>
  );
}
