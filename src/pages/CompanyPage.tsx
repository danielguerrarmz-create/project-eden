/**
 * CompanyPage.tsx — what the company does (/company).
 *
 * A sibling to the Engine page in the documentation layer (field color +
 * editorial serif + hairline linework), but pulled up a level: not what the
 * engine computes, what the COMPANY is. Eight full-bleed field sections walk
 * the whole of it — the living structure, the fabrication grammar / DFM, the
 * generative engine (deliberately kept subordinate), stewardship, and how the
 * value moves from the artifact to the generator.
 *
 * Framing discipline (carried from every prior handoff): the living structures
 * are the product; the engine is a tool in service of them, never the hero.
 * Register switches on purpose — technical for the grammar / engine / scale
 * beats, lyrical for the vision and the close. The name is read from WORDMARK,
 * never hard-coded. Honesty rule holds: no delivered-commission, secured-LOI,
 * certification, or proven-margin claims — forward things are stated as the
 * roadmap, plainly, because a serious version of this only earns trust honest.
 */
import { useReducedMotion } from '../ui/useReducedMotion';
import { WORDMARK } from '../data/config';
import { routes } from '../routing';
import { Eyebrow, EngineSection, AnnotationStrip } from './engine/EngineSection';
import { OperatingLoop } from './company/OperatingLoop';

const H1 = 'font-quote font-bold leading-[0.98] tracking-[-0.02em] text-[clamp(2.75rem,6vw,5.5rem)]';
const H2 = 'font-serifDisplay font-semibold leading-[1.04] tracking-[-0.01em] text-[clamp(1.75rem,3.5vw,3rem)]';
const PULL = 'font-serifDisplay italic leading-[1.06] tracking-[-0.01em] text-[clamp(2rem,4.6vw,3.75rem)]';
const BODY = 'mt-6 max-w-[60ch] text-[17px] leading-relaxed opacity-90';
const BODY2 = 'mt-4 max-w-[60ch] text-[17px] leading-relaxed opacity-90';

const NAME = WORDMARK.charAt(0).toUpperCase() + WORDMARK.slice(1);

export function CompanyPage() {
  const reduced = useReducedMotion();

  return (
    <div className="min-h-screen w-full bg-fieldBlue">
      {/* Quiet header: mono wordmark + real anchors across the documentation layer. */}
      <header className="flex items-center justify-between bg-fieldBlue px-6 pt-6 text-inkNavy sm:px-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-80">
          {WORDMARK} · what we do
        </span>
        <nav className="flex items-center gap-5">
          <a href={routes.engine}
            className="font-mono text-[11px] uppercase tracking-[0.14em] underline decoration-inkNavy/40 underline-offset-4 transition hover:decoration-inkNavy focus-visible:decoration-inkNavy"
          >
            the engine
          </a>
          <a href={routes.studio}
            className="font-mono text-[11px] uppercase tracking-[0.14em] underline decoration-inkNavy/40 underline-offset-4 transition hover:decoration-inkNavy focus-visible:decoration-inkNavy"
          >
            the studio
          </a>
        </nav>
      </header>

      {/* 1 — HERO (field-blue, the one Bodoni moment) */}
      <EngineSection ground="blue" reduced={reduced}>
        <Eyebrow>The company</Eyebrow>
        <h1 className={`mt-4 ${H1}`}>
          We build the one kind of architecture that isn&rsquo;t <em className="italic">finished</em>{' '}
          on the day it&rsquo;s installed.
        </h1>
        <p className="mt-8 max-w-[62ch] text-[18px] leading-relaxed opacity-90">
          {NAME} makes living garden architecture, curved timber structures designed as armatures
          for the plants that will clothe them. The frame goes up in a week. The building completes
          over three years, as the garden grows into it. Everything we do is organized around one
          unusual promise: that the most valuable thing we make only becomes itself after we&rsquo;ve
          left. Architecture the garden grows into.
        </p>
      </EngineSection>

      {/* 2 — THE OPERATING LOOP (vellum) + diagram */}
      <EngineSection ground="vellum" reduced={reduced}>
        <Eyebrow>The whole of it, on one page</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          Five things, and the fifth <em className="italic">feeds</em> the first.
        </h2>
        <p className={BODY}>
          We design the structure, manufacture its parts, assemble it, plant it, and steward it as it
          grows in. Most firms in this space do one or two of those and buy the rest. Doing all five
          is unusual. But the real move is the last edge of the loop: every structure we build widens
          the engineered family the next one is drawn from. So the loop doesn&rsquo;t just repeat. It
          compounds. Each turn makes the next one cheaper, faster, and more certain.
        </p>

        <div className="mx-auto mt-12 max-w-[620px]">
          <OperatingLoop />
          <AnnotationStrip>
            design → manufacture → assemble → plant → steward · the return edge widens the grammar
          </AnnotationStrip>
        </div>
      </EngineSection>

      {/* 3 — THE LIVING STRUCTURE (chartreuse) — the product, lyrical */}
      <EngineSection ground="chartreuse" reduced={reduced}>
        <Eyebrow>What we make</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          The timber is the <em className="italic">skeleton</em>. The garden is the rest.
        </h2>
        <p className={BODY}>
          On install day, what stands is an armature: a fine timber lattice, tuned to how one specific
          plant physically climbs. Year one, it&rsquo;s roughly a third clothed. By year three it
          reads as a canopy: shade, scent, habitat, and a texture of birdsong the drawing could never
          promise. It doesn&rsquo;t wear out the way a garden building does. It settles in, the way a
          garden does. A timber shed depreciates; a living structure appreciates.
        </p>
        <p className={BODY2}>
          The forms are pavilions, garden studios, and saunas, all of them armatures for climbing
          plants, made for private gardens and for design-led hospitality. But the object was never
          the point. The point is the return to something alive, made deliberately, made for you.
          Nature, treated as the luxury it has quietly become.
        </p>
      </EngineSection>

      {/* 4 — DESIGN FOR MANUFACTURE (yellow) — technical */}
      <EngineSection ground="yellow" reduced={reduced}>
        <Eyebrow>Why organic architecture has always cost a fortune</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          The price was never the timber. It was the <em className="italic">uncertainty</em>.
        </h2>
        <p className={BODY}>
          Curved, one-off, organic buildings are expensive because every shape is a fresh engineering
          problem: a fresh structural check, a fresh quote, a fresh risk premium on the unknown. We
          remove the uncertainty, not the curve. A fabrication grammar, a stated set of cutting and
          structural rules, bounds the entire design space so that every form a client can reach
          already resolves to flat CNC components, a proven structural family, an assembly sequence,
          and a fixed price. The complexity stays. The risk premium on it collapses.
        </p>
        <p className={BODY2}>
          That makes manufacture a repeatable step instead of a bespoke build each time. We outsource
          all CNC cutting, permanently, so parts arrive as flat blanks nested on standard sheet stock.
          We self-perform assembly on the first commissions, to learn the structure with our own
          hands and hold the margin, then certify partner crews to place the rest. Design for
          manufacture is not a constraint we tolerate. It is the whole reason the thing can exist at a
          price a client will pay.
        </p>
      </EngineSection>

      {/* 5 — THE GENERATIVE ENGINE (vellum) — technical, deliberately subordinate */}
      <EngineSection ground="vellum" reduced={reduced}>
        <Eyebrow>The tool, not the hero</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          The engine earns its place <em className="italic">downstream</em> of the grammar.
        </h2>
        <p className={BODY}>
          The engine is how a client shapes a form and watches a guaranteed price move beside it, in
          real time, as they go. It&rsquo;s good, and it&rsquo;s real, but it is a tool in service of
          the structure, not the point of the company. The order matters: resolve the fabrication
          grammar first, and real-time pricing, a learnable design space, and certification-by-family
          all fall out of it. Machine learning lives downstream of that domain knowledge, searching
          and widening the space, never conjuring geometry from nothing.
        </p>
        <p className={BODY2}>
          That inversion is the part we care about most. Here, computation makes a real, growing place
          cheaper and safer to bring into being. It is not another machine for generating more images
          of places that will never exist. The technology points back toward the world, not away from
          it.
        </p>
        <a href={routes.engine}
          className="mt-10 inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkBlack/30 underline-offset-4 transition hover:decoration-accentOlive focus-visible:decoration-accentOlive"
        >
          See exactly what the engine computes →
        </a>
      </EngineSection>

      {/* 6 — STEWARDSHIP (chartreuse) */}
      <EngineSection ground="chartreuse" reduced={reduced}>
        <Eyebrow>The second half of the product</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          We don&rsquo;t hand over a structure and <em className="italic">leave</em>.
        </h2>
        <p className={BODY}>
          If the building only completes in year three, then the years after install are not
          aftercare. They are the second half of the product. We tend the planting, guide the growth, and keep
          the armature and its small ecosystem healthy while it becomes what it was drawn to be. The
          living-wall industry already prices this kind of care at a single-digit percentage of
          install value every year. We treat it as the relationship the whole company is built to
          hold, and as recurring revenue that follows every structure we place, not a cost centre
          bolted on afterward.
        </p>
      </EngineSection>

      {/* 7 — HOW IT SCALES (yellow) — technical, honest about the roadmap */}
      <EngineSection ground="yellow" reduced={reduced}>
        <Eyebrow>Where the leverage actually is</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          The value moves from the <em className="italic">artifact</em> to the generator.
        </h2>
        <p className={BODY}>
          The moat is not any one pavilion, however beautiful. It is the certified structural system
          itself. Each delivered build widens the engineered family, and every future instance
          inherits that validation, so the per-unit cost of proving a design buildable falls toward
          zero as the family grows. The economics shift from making a lovely object, one at a time, to
          owning the generator that makes them buildable, priceable, and certifiable by default.
        </p>
        <p className={BODY2}>
          Said plainly, because it should be: this is the roadmap, not a finished moat. Widening the
          family still takes a chartered engineer, one sign-off at a time, and the very next thing we
          build is the first physical prototype. We&rsquo;d rather state where we are than pretend to
          be further along. A serious version of this only earns trust if it&rsquo;s honest about
          what&rsquo;s built and what&rsquo;s ahead.
        </p>
      </EngineSection>

      {/* 8 — WHAT WE BELIEVE (field-blue) — emotional close, pull-quote */}
      <EngineSection ground="blue" reduced={reduced}>
        <Eyebrow>Why we&rsquo;re building this</Eyebrow>
        <p className={`mt-4 ${PULL}`}>
          The rarest luxury left is a living thing that was <em className="not-italic">made</em> for
          you.
        </p>
        <p className="mt-8 max-w-[60ch] text-[18px] leading-relaxed opacity-90">
          We don&rsquo;t think the future people actually want is more screens between them and the
          world. We think it&rsquo;s a way back into it. So the technology, here, is entirely in
          service of that return: it makes a real, growing, breathing place cheaper and safer to bring
          into being. We build the armature. The garden finishes the work.
        </p>
        <p className="mt-8 font-serifDisplay text-[20px] italic opacity-80">
          Architecture the garden grows into.
        </p>

        <a href={routes.studio}
          className="mt-12 inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkNavy/40 underline-offset-4 transition hover:decoration-inkNavy focus-visible:decoration-inkNavy"
        >
          Shape a {NAME} in the studio →
        </a>
      </EngineSection>
    </div>
  );
}
