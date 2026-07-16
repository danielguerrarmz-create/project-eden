/**
 * AscentPage.tsx — the About page you climb. Draft at #/about/ascent.
 *
 * The page is one upward journey: you land at the ROOTS (the title, the two
 * questions, a blossom branch rooted on the page's floor) and climb through the
 * One Stem story vine, the founders, and the work index to the pigment crown at
 * the summit, directly beneath the header's wordmark. "Grown, not built" as a
 * scroll direction.
 *
 * Mechanics: the chat-log pattern. The scroller is a full-height flex
 * column-reverse container, so DOM ORDER STAYS READING ORDER (roots → … →
 * summit) — screen readers, tab order, and tests see a normal page — while the
 * visual stack inverts and the browser pins the initial scroll to the bottom
 * for free. `overscroll-contain` keeps mobile pull-to-refresh from firing on
 * the final (upward) swipe at the summit.
 *
 * ESCAPE HATCH: set ASCENT = false and the same DOM renders as a conventional
 * downward page (flex-col, no affordance line). Direction is a design toggle,
 * not an architecture.
 *
 * Art direction rules carried from the design review (2026-07-16): vellum
 * ground; serif reading voice; INK_BLUE never at body size; pigment is rationed
 * to exactly TWO events — the roots' hero branch and the summit crown; the vine
 * and the founder specimens speak the ink voice; aged paper only inside mounts.
 */
import { Fragment } from 'react';
import { Frame } from '../../ui/Frame';
import { BowerMark } from '../../ui/BowerMark';
import { SplashHeader } from '../splash/SplashHeader';
import { QUESTIONS } from '../AboutPage';
import { INK_BLUE } from '../about/CrossPathsTimeline';
import { TEAM, TEAM_CODA } from '../about/projects';
import { FanPainting } from '../scroll/FanPainting';
import { groupProjects, PAINTINGS, type Commission } from '../scroll/paintings';
import { OneStem } from './OneStem';
import { WorkIndex } from './WorkIndex';

/** The direction toggle. True = the climb; false = the same DOM as a normal page. */
const ASCENT = true;

const MONO_SMALL = 'font-mono text-[12px] uppercase tracking-[0.08em]';
const KICKER = 'font-mono text-[12px] uppercase tracking-[0.14em] text-inkBlack/60';

/** The seam between climb stations: one blue hairline in a breath of vellum. */
function Seam() {
  return (
    <div aria-hidden className="flex justify-center py-[clamp(4rem,11vh,8rem)]">
      <span className="h-px w-16" style={{ backgroundColor: INK_BLUE }} />
    </div>
  );
}

/** Underline the two load-bearing words of the practice's questions. */
function QuestionLine({ text }: { text: string }) {
  const parts = text.split(/(grown|AI)/);
  return (
    <p className={`${MONO_SMALL} text-inkBlack/80`}>
      {parts.map((part, i) =>
        part === 'grown' || part === 'AI' ? (
          <span key={i} className="border-b" style={{ borderColor: INK_BLUE }}>
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  );
}

/** Base camp: the landing view. The branch is rooted on the page's literal floor. */
function Roots() {
  return (
    <section className="relative min-h-[100dvh] overflow-hidden">
      <Frame measure="read" className="relative z-10 flex min-h-[100dvh] flex-col justify-center py-24">
        <h1 className="font-quote font-bold leading-[0.98] tracking-[-0.02em] text-[clamp(2.5rem,5.5vw,5rem)]">
          <span className="block">We've been chasing</span>
          <span className="block">it</span>
          <span className="block">for five years.</span>
        </h1>
        <div className="mt-10 space-y-3">
          {QUESTIONS.map((q) => (
            <QuestionLine key={q.label} text={q.text} />
          ))}
        </div>
        {ASCENT && (
          <p className={`${KICKER} mt-14`}>
            grown, not built — start at the roots <span style={{ color: INK_BLUE }}>↑</span>
          </p>
        )}
      </Frame>
      <div className="pointer-events-none absolute bottom-[-6%] right-[-14%] z-0 w-[min(58vw,680px)] md:right-[-4%]">
        <FanPainting commission={PAINTINGS.hero} size={680} eager caption={false} />
      </div>
    </section>
  );
}

/** The people, met on the way up: person, facts, and the ink specimen grown from their name. */
function Founders() {
  return (
    <Frame measure="page" as="section">
      <div className="flex flex-col-reverse">
        <p className={KICKER}>The founders.</p>
        <div className="mb-12 flex flex-col-reverse gap-16">
          {TEAM.map((member) => {
            const base = member.name.startsWith('Clay') ? PAINTINGS.clay : PAINTINGS.daniel;
            const commission: Commission = { ...base, voice: 'ink' };
            return (
              <div
                key={member.name}
                className="grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)_minmax(0,5fr)] md:items-start"
              >
                <figure>
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      loading="lazy"
                      className="aspect-[4/5] w-full border border-inkBlack/12 object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/5] w-full items-center justify-center border border-dashed border-inkBlack/20">
                      <span className={`${MONO_SMALL} text-inkBlack/50`}>Portrait to come</span>
                    </div>
                  )}
                  <figcaption className="mt-3">
                    <span className={`${MONO_SMALL} block text-inkBlack`}>{member.name}</span>
                    <span className={`${MONO_SMALL} block text-inkBlack/60`}>{member.role}</span>
                  </figcaption>
                </figure>
                <dl className="space-y-6">
                  {member.facts.map((fact) => (
                    <div key={fact.label}>
                      <dt className={`${MONO_SMALL} text-inkBlack/60`}>{fact.label}</dt>
                      <dd className="mt-1.5 max-w-[52ch] text-[17px] leading-relaxed opacity-90">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
                <FanPainting commission={commission} size={340} className="md:justify-self-end" />
              </div>
            );
          })}
        </div>
      </div>
    </Frame>
  );
}

/** The summit: the one other pigment event, directly beneath the header's wordmark. */
function Summit() {
  return (
    <Frame measure="read" as="section" className="pt-header">
      <div className="flex min-h-[88dvh] flex-col items-center justify-center pb-10 pt-10 text-center">
        <div className="relative w-full max-w-[540px]">
          <FanPainting commission={PAINTINGS.eden} size={540} caption={false} />
          <div className="absolute inset-x-0 bottom-[5%] flex justify-center">
            <BowerMark markSize={22} nameClass="font-mono text-[13px] lowercase tracking-[0.2em]" />
          </div>
        </div>
        <p className={`${KICKER} mt-12`}>{TEAM_CODA.payoffLabel}</p>
        <p className="mt-3 font-serifDisplay text-[clamp(1.35rem,2.6vw,1.9rem)] italic leading-snug">
          {TEAM_CODA.payoff}
        </p>
      </div>
    </Frame>
  );
}

export function AscentPage() {
  const groups = groupProjects();
  return (
    <div className="h-[100dvh] bg-paperVellum font-serifDisplay text-inkBlack">
      <SplashHeader measure="page" />
      {/* [&>*]:flex-none: sections are flex items now — without it the scroller would
          try to SHRINK them to fit the viewport instead of scrolling. */}
      <main
        className={`h-full overflow-y-auto overscroll-contain [&>*]:flex-none ${
          ASCENT ? 'flex flex-col-reverse' : 'flex flex-col'
        }`}
      >
        {/* DOM order = reading order; the container direction decides the journey. */}
        <Roots />
        <Seam />
        <OneStem />
        <Seam />
        <Founders />
        <Seam />
        <WorkIndex groups={groups} />
        <Seam />
        <Summit />
      </main>
    </div>
  );
}
