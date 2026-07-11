/**
 * MachineLearningPage.tsx — the machine-learning agenda (/machine-learning).
 *
 * One set of aims, told three times at increasing depth: Level I in plain
 * words for anyone, Level II in the language of a business for investors,
 * Level III in the language of the field for ML practitioners. Same
 * documentation layer as Company/Engine (field colors + editorial serif +
 * mono eyebrows), and the same framing discipline: the structures are the
 * product; learning is a tool downstream of the fabrication grammar, never
 * the hero.
 *
 * Honesty rule holds harder here than anywhere on the site: no trained model
 * exists yet and the page says so, in its own section. What exists is the
 * deterministic feasibility judge (the engine) and the logbook it writes.
 * Everything else is stated as the agenda, plainly.
 */
import { useReducedMotion } from '../ui/useReducedMotion';
import { WORDMARK } from '../data/config';
import { routes } from '../routing';
import { Eyebrow, EngineSection, AnnotationStrip } from './engine/EngineSection';

const H1 = 'font-quote font-bold leading-[0.98] tracking-[-0.02em] text-[clamp(2.75rem,6vw,5.5rem)]';
const H2 = 'font-serifDisplay font-semibold leading-[1.04] tracking-[-0.01em] text-[clamp(1.75rem,3.5vw,3rem)]';
const PULL = 'font-serifDisplay italic leading-[1.06] tracking-[-0.01em] text-[clamp(2rem,4.6vw,3.75rem)]';
const BODY = 'mt-6 max-w-[60ch] text-[17px] leading-relaxed opacity-90';
const BODY2 = 'mt-4 max-w-[60ch] text-[17px] leading-relaxed opacity-90';

const NAME = WORDMARK.charAt(0).toUpperCase() + WORDMARK.slice(1);

export function MachineLearningPage() {
  const reduced = useReducedMotion();

  return (
    <div className="min-h-screen w-full bg-fieldBlue">
      {/* Quiet header: mono wordmark + real anchors across the documentation layer. */}
      <header className="flex items-center justify-between bg-fieldBlue px-6 pt-6 text-inkNavy sm:px-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-80">
          {WORDMARK} · machine learning
        </span>
        <nav className="flex items-center gap-5">
          <a href={routes.company}
            className="font-mono text-[11px] uppercase tracking-[0.14em] underline decoration-inkNavy/40 underline-offset-4 transition hover:decoration-inkNavy focus-visible:decoration-inkNavy"
          >
            the company
          </a>
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
        <Eyebrow>Machine learning at {NAME}</Eyebrow>
        <h1 className={`mt-4 ${H1}`}>
          We&rsquo;re teaching machines to dream only what can be{' '}
          <em className="italic">built</em>.
        </h1>
        <p className="mt-8 max-w-[62ch] text-[18px] leading-relaxed opacity-90">
          This page states our technical aims three times, each pass one level deeper: first in
          plain words, then in the language of a business, last in the language of machine-learning
          research. The three levels are the same truth at different magnifications. Read until you
          have what you came for.
        </p>
      </EngineSection>

      {/* 2 — LEVEL I (vellum) — plain words, for anyone */}
      <EngineSection ground="vellum" reduced={reduced}>
        <Eyebrow>Level I · in plain words</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          The dreaming was never the hard part. The <em className="italic">judging</em> was.
        </h2>
        <p className={BODY}>
          A computer can dream up a beautiful building in seconds — and lie in the same breath.
          Most dreamed shapes cannot be built, and none of them arrive with a price. The hard part
          is knowing, instantly and truthfully, whether a shape can exist: which pieces of timber,
          cut how, joined how, shipped how, for how much.
        </p>
        <p className={BODY2}>
          So the first thing we built is not a dreamer. It is a judge — a strict building inspector
          and cost estimator, in software. Hand it the skeleton of a structure and it answers with
          the exact shape of every piece and a real price, or it names precisely which piece fails
          and why. It never hand-waves. Our machine-learning aim, in one sentence: teach dreaming
          machines to work for that judge — so that when you show us a picture you love, what comes
          back isn&rsquo;t another picture. It&rsquo;s a structure you can own: priced, buildable,
          ready to plant.
        </p>
        <div className="mt-10 border-t border-inkBlack/15 pt-4">
          <AnnotationStrip>
            a picture you love → the dreamer → the judge → every piece drawn · a real price
          </AnnotationStrip>
        </div>
      </EngineSection>

      {/* 3 — LEVEL II (chartreuse) — the business of it, for investors */}
      <EngineSection ground="chartreuse" reduced={reduced}>
        <Eyebrow>Level II · as a business</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          Models are commodities. <em className="italic">Judges</em> are not.
        </h2>
        <p className={BODY}>
          Every design the engine evaluates gets the same treatment: the exact geometry of every
          piece and a guaranteed price, or a named failure. All of it is logged. That gives the
          company two assets that compound independently of any single sale: a growing engineered
          family of structures, and a private dataset of fabrication truth — exactly what a
          generative model needs to learn from, and the one ingredient that cannot be scraped,
          licensed, or fine-tuned into existence, because it has never existed anywhere.
        </p>
        <p className={BODY2}>
          The architecture is a compiler&rsquo;s. In front, many shape generators: a parametric
          recipe today, a hands-on sculpting tool already live, learned models when the logbook
          justifies them. In the middle, one standard order form every generator must fill out.
          Behind, interchangeable building-method modules — flat-cut rigid pieces today, bent
          timber next (the whole lineage we draw on is bent), laminated free-form with partners
          later — each certified once by a chartered engineer, with every design in its family
          inheriting the sign-off. The moat is not network weights. It is the judge, its logbook,
          and the certified families behind it.
        </p>
      </EngineSection>

      {/* 4 — LEVEL III, part one (yellow) — the learning problem, for practitioners */}
      <EngineSection ground="yellow" reduced={reduced}>
        <Eyebrow>Level III · for practitioners</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          Conditional generation against an <em className="italic">exact</em> feasibility oracle.
        </h2>
        <p className={BODY}>
          Strip away the botany and the technical object is this: conditional generation over a
          structured design space — networks of timber members on doubly-curved surfaces, each
          member carrying a role, a stock section, and a pair of end conditions. What makes the
          problem unusual is that feasibility here is exactly decidable. A deterministic pipeline
          resolves every member end to a cut geometry, every piece to a solid, every solid onto
          standard sheet stock, and the whole to a price — or fails with a named reason. That is a
          cheap, exact feasibility oracle, and it inverts the usual economics of generative design:
          we never need to learn a reward model for buildability, because we can compute it.
          Learned components propose; the oracle disposes.
        </p>
        <p className={BODY2}>
          Generation is neurosymbolic by commitment, not fashion. The output space is not meshes or
          point clouds but programs — derivations in a fabrication grammar whose every well-formed
          output already satisfies most constraints by construction: stock sections, joint
          families, spacing and span rules. What the grammar cannot guarantee, oracle-in-the-loop
          sampling handles: propose, judge, repair or reject, and log every verdict. Raw-geometry
          generation is the obvious approach and the wrong one — a mesh model spends nearly all of
          its capacity on surface detail the fabrication method determines anyway.
        </p>
        <p className={BODY2}>
          There is no ImageNet of buildable timber structures, and we don&rsquo;t need one. Because
          the oracle is a labeling function, the dataset is synthetic and self-supervised:
          procedural samplers walk the program space, the oracle stamps every sample with
          feasibility, degradations, cut schedules, and price, and every design a human shapes in
          the studio is logged identically. Fabrication-true labels compound daily, as a by-product
          of the product itself.
        </p>
      </EngineSection>

      {/* 5 — LEVEL III, part two (vellum) — physics, inversion, non-goals */}
      <EngineSection ground="vellum" reduced={reduced}>
        <Eyebrow>Level III · the physics, and the non-goals</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          Generate the <em className="italic">rest</em> configuration. Let physics be the decoder.
        </h2>
        <p className={BODY}>
          The factorization we exploit: learn the global form; resolve members exactly. Classical
          solvers own everything below the node graph — joint resolution, piece solids, nesting —
          and always will. The factorization has one known failure mode, and it is the interesting
          one: bending-active systems, where the built geometry is the elastic equilibrium of the
          members and cannot be chosen independently of them. There, the design variables move into
          the rest configuration — flat lath layouts, lengths, anchor points — and a differentiable
          elastic-rod simulator becomes the decoder: generate flat, simulate to three dimensions,
          score against intent, backpropagate. Physics as decoder, not as constraint.
        </p>
        <p className={BODY2}>
          Intent capture is inverse design, staged by what the data allows. Now:
          vision-language-guided search — score candidate programs against a client&rsquo;s
          reference image and descend through program space, zero training required. Next: amortize
          the inversion, image or text to program, trained on the unlimited (render, program) pairs
          the pipeline emits for free. The client-facing promise stays constant while the machinery
          under it gets faster.
        </p>
        <p className={BODY2}>
          Verification stays symbolic end to end: frame analysis on the member graph, family-level
          certification by a chartered engineer, and the engine&rsquo;s standing honesty discipline
          — unverified constants are marked as unverified, degradations render as degradations,
          nothing pretends. The non-goals, equally plainly: no text-to-image renderings of
          pavilions that will never exist; no end-to-end black-box geometry; no learned
          approximation of anything we can compute exactly.
        </p>
      </EngineSection>

      {/* 6 — WHERE THIS STANDS (chartreuse) — the honesty section */}
      <EngineSection ground="chartreuse" reduced={reduced}>
        <Eyebrow>Where this actually stands</Eyebrow>
        <h2 className={`mt-4 ${H2}`}>
          What&rsquo;s built and what&rsquo;s ahead, <em className="italic">stated</em> plainly.
        </h2>
        <p className={BODY}>
          What exists today is the judge and the studio around it: the deterministic engine, the
          priced cut lists, the sculpting prototype, the logbook. What does not exist yet: any
          trained model, any physical prototype, any certified family. The levels above are the
          agenda, not the inventory. We&rsquo;d rather state where we are than pretend to be
          further along — a serious version of this only earns trust if it&rsquo;s honest about
          what&rsquo;s built and what&rsquo;s ahead.
        </p>
      </EngineSection>

      {/* 7 — CLOSE (field-blue) — pull-quote + the framing that governs everything */}
      <EngineSection ground="blue" reduced={reduced}>
        <Eyebrow>The point of it</Eyebrow>
        <p className={`mt-4 ${PULL}`}>
          The dream is cheap. The <em className="not-italic">judge</em> is the company.
        </p>
        <p className="mt-8 max-w-[60ch] text-[18px] leading-relaxed opacity-90">
          None of this is machine learning for its own sake. The models exist so that a real,
          growing, breathing place is cheaper and more certain to bring into being — computation
          pointing back toward the world, not away from it. We build the judge and teach the
          dreamers. The garden finishes the work.
        </p>

        <a href={routes.engine}
          className="mt-12 inline-block font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkNavy/40 underline-offset-4 transition hover:decoration-inkNavy focus-visible:decoration-inkNavy"
        >
          See exactly what the engine computes →
        </a>
        <a href={routes.studio}
          className="mt-3 block w-fit font-mono text-[12px] uppercase tracking-[0.14em] underline decoration-inkNavy/40 underline-offset-4 transition hover:decoration-inkNavy focus-visible:decoration-inkNavy"
        >
          Shape a {NAME} in the studio →
        </a>
      </EngineSection>
    </div>
  );
}
