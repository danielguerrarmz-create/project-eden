/**
 * HowItWorks.tsx — the "how it works" walkthrough on the standalone #/engine page
 * (EnginePage), the destination of the nav's "how it works" and the home's "see the
 * full walkthrough" link.
 *
 * REWRITTEN 2026-07-17 (round 11, Daniel) for a complete layperson: a normal person,
 * not a designer or architect, should follow the whole thing without one piece of
 * jargon. It tells the product's own lifecycle arc, in four plain beats:
 *   shape it -> it's real and buildable -> a plant grows into it -> we keep it alive.
 *
 * This REPLACES the old six-section engineer-facing walkthrough (fabrication grammar,
 * solar declination/azimuth, density fields, saturating curves) and its five technical
 * diagrams. Graphics were cut from five to TWO meaningful ones: a simple "kit of real
 * parts" schematic (drawn from the live component counts, so it stays honest output),
 * and a render of an Eden grown in beside a home at dusk (Daniel's image, 2026-07-17,
 * which replaced a growth timelapse video). No pricing on this page by Daniel's ruling:
 * product and process only, numbers live in the studio/commission flow.
 *
 * Copy note: no em/en dashes anywhere in this file's hand-authored copy.
 */
import type { EngineOutputs } from '../../engine/types';
import { PRODUCT } from '../../data/config';
import { routes } from '../../routing';
import { Eyebrow, EngineSection } from '../engine/EngineSection';
import { H1, H2, BODY } from '../typeScale';

/** The four things a client shapes, said the way a normal person would say them. */
const DIALS = [
  ['How big', 'how much ground it covers'],
  ['How tall', 'how high it stands'],
  ['How fine', 'how close together the woven timber runs'],
  ['How it opens', 'where the canopy lifts open to the sky'],
] as const;

/**
 * A simple schematic of the finished design AS A KIT: the same structure shown as three
 * groups of real parts, pulled apart along one axis the way it comes apart on screen.
 * It is deliberately a diagram, not a picture, and its counts are LIVE engine output
 * (feet, rings, spokes, total pieces) so it stays honest rather than illustrative.
 */
function KitSchematic({ outputs }: { outputs: EngineOutputs }) {
  const { feetCount, ringCount, spokeCount } = outputs.geometry;
  const total = outputs.components.totalCount;
  const bands = [
    { y: 34, label: 'the crown ring', count: `${ringCount} rings` },
    { y: 104, label: 'the woven lattice', count: `${spokeCount} spokes` },
    { y: 190, label: 'the feet', count: `${feetCount} feet` },
  ];
  return (
    <figure className="w-full">
      <svg viewBox="0 0 340 250" className="w-full" role="img"
        aria-label="A schematic of the design as a kit of real timber parts: a crown ring, the woven lattice, and the feet, pulled apart in the order they are built">
        {/* guide axis the parts separate along */}
        <line x1="90" y1="20" x2="90" y2="230" stroke="currentColor" strokeWidth="1"
          strokeDasharray="2 5" opacity="0.35" />
        {/* crown ring */}
        <ellipse cx="90" cy="34" rx="34" ry="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
        {/* woven lattice: a dome with a few crossing runs to read as "woven" */}
        <path d="M40 128 Q90 70 140 128" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M52 128 Q90 92 128 128" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <path d="M66 90 L114 126" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <path d="M114 90 L66 126" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        {/* feet */}
        <path d="M60 190 l-6 26 M90 190 l0 30 M120 190 l6 26" stroke="currentColor" strokeWidth="1.4" fill="none" />
        {/* labels */}
        {bands.map((b) => (
          <g key={b.label}>
            <line x1="150" y1={b.y} x2="182" y2={b.y} stroke="currentColor" strokeWidth="1" opacity="0.3" />
            <text x="190" y={b.y - 3} className="font-serifDisplay" fontSize="15" fill="currentColor">{b.label}</text>
            <text x="190" y={b.y + 14} fontSize="10.5" letterSpacing="0.12em" fill="currentColor" opacity="0.6"
              style={{ fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase' }}>{b.count}</text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] opacity-60">
        the same design, as ~{total} real timber parts
      </figcaption>
    </figure>
  );
}

export function HowItWorks({
  outputs,
  reduced,
  lead = false,
}: {
  outputs: EngineOutputs;
  reduced: boolean;
  /** True on the ENGINE page, where this band is the first thing under the fixed header
   *  and must clear it. On the splash it sits below the hero, so it must NOT. */
  lead?: boolean;
}) {
  return (
    <>
      {/* HERO (field-blue): what it is, in plain words, and the four beats to come. */}
      <EngineSection ground="blue" reduced={reduced} id="how-it-works" wide lead={lead}>
        <div className="max-w-[60ch]">
          <Eyebrow>How it works</Eyebrow>
          <h2 className={`mt-4 ${H1}`}>
            You <em className="italic">grow</em> a garden structure. You don't buy one off a shelf.
          </h2>
          <p className="mt-8 text-[18px] leading-relaxed opacity-90">
            An Eden is a one of a kind timber structure for your garden, a curved, woven canopy on a
            few feet, open to the sky and made to be covered by a climbing plant. You shape a few
            simple things, a design engine turns them into a real structure you could build, and a
            plant grows into it season after season. Here is the whole of it, in four steps.
          </p>
        </div>

        <ol className="mt-10 grid gap-x-10 gap-y-3 font-serifDisplay text-[17px] sm:grid-cols-2 lg:grid-cols-4">
          {['You shape it', "It's real and buildable", 'A plant grows into it', 'We keep it alive'].map(
            (s, i) => (
              <li key={s} className="flex items-baseline gap-3">
                <span className="font-mono text-[12px] text-accentOlive">{`0${i + 1}`}</span>
                <span>{s}</span>
              </li>
            ),
          )}
        </ol>
      </EngineSection>

      {/* 01 — YOU SHAPE A FEW SIMPLE THINGS (vellum). */}
      <EngineSection ground="vellum" reduced={reduced} wide>
        <div className="max-w-[64ch]">
          <Eyebrow>01 · You shape it</Eyebrow>
          <h2 className={`mt-4 ${H2}`}>
            You shape a few simple things, not a <em className="italic">shape</em>.
          </h2>
          <p className={BODY}>
            You are not drawing a building or picking one from a catalogue. You set four plain things,
            and choose the plant that will one day cover it. That is the whole of what you decide.
          </p>
        </div>

        <dl className="mt-10 grid max-w-[70ch] gap-x-12 gap-y-6 sm:grid-cols-2">
          {DIALS.map(([term, plain]) => (
            <div key={term} className="border-t border-inkBlack/15 pt-4">
              <dt className="font-serifDisplay text-[20px]">{term}</dt>
              <dd className="mt-1 text-[16px] leading-relaxed opacity-80">{plain}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 max-w-[64ch] text-[17px] leading-relaxed opacity-90">
          The important part is what you cannot do: you can never shape something that cannot be
          built. Behind every choice is a set of building rules, so the only structures you can make
          are ones that can really be cut from timber and stood up in a garden. Make it smaller and it
          quietly keeps itself under the height a garden building is allowed. Make it wider and it adds
          another foot so it stays strong. You get the freedom to shape it, without the freedom to
          design something impossible.
        </p>
      </EngineSection>

      {/* 02 — IT'S REAL, AND YOU CAN SEE EVERY PART (yellow). Split: text + kit schematic. */}
      <EngineSection ground="yellow" reduced={reduced} wide>
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <Eyebrow>02 · It's real and buildable</Eyebrow>
            <h2 className={`mt-4 ${H2}`}>
              It's a real thing, and you can see <em className="italic">every</em> part.
            </h2>
            <p className={BODY}>
              When you are happy with the shape, the design becomes a real kit: every curved timber
              piece, cut and counted. On screen you can take it apart and watch it come back together
              in the exact order it would be built on site, from the feet up, crown last.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed opacity-90">
              Nothing here is a painting of a building that might exist. It is the structure itself,
              drawn from its own parts list, which is how we can promise that what you shape is what
              you could build.
            </p>
          </div>
          <KitSchematic outputs={outputs} />
        </div>
      </EngineSection>

      {/* 03 — A PLANT GROWS INTO IT, AND WE KEEP IT ALIVE (chartreuse). Split: growth + text. */}
      <EngineSection ground="chartreuse" reduced={reduced} wide>
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <figure className="order-2 md:order-1">
            <img
              src="/assets/product/pavilion-garden-sunset.webp"
              alt="An Eden grown in at dusk: the woven timber pavilion covered in wisteria and roses in a garden beside a stone house, a couple and their dog nearby"
              loading="lazy"
              decoding="async"
              className="block h-auto w-full"
            />
          </figure>
          <div className="order-1 md:order-2">
            <Eyebrow>03 · It comes alive</Eyebrow>
            <h2 className={`mt-4 ${H2}`}>
              A plant grows into it, and we help you <em className="italic">keep</em> it alive.
            </h2>
            <p className={BODY}>
              An Eden is planted the day it is built, a bare lattice and a young climber. Each season
              it holds more leaf and more flower than the one before, until the timber is half hidden
              under it. It is never quite finished, in the best way.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed opacity-90">
              And because it is alive, it is not left on its own. We look after it, the way a garden is
              looked after, not the way a building is left to stand. A pavilion does not need tending.
              A living structure does.
            </p>
          </div>
        </div>
      </EngineSection>

      {/* CLOSE (vellum): one honest note (no pricing), then the CTA into the studio. */}
      <EngineSection ground="vellum" reduced={reduced} wide>
        <div className="max-w-[64ch]">
          <Eyebrow>One honest note</Eyebrow>
          <p className={`${BODY} mt-4`}>
            The growth you see over the years is a careful projection, worked out from how quickly your
            chosen plant tends to climb. It is an honest picture of how an Eden fills in, not a promise
            of an exact year. Everything about the structure itself, its shape, its parts, the fact
            that it can be built, is real.
          </p>
          <a
            href={routes.studio}
            className="mt-10 inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-accentOlive focus-visible:decoration-accentOlive"
          >
            Shape your own {PRODUCT} →
          </a>
        </div>
      </EngineSection>
    </>
  );
}
