/**
 * paintings.ts — the commission ledger for the About page's botanical specimens.
 *
 * The page hangs TWO paintings (the flower economy is a design rule, not a shortage): the
 * founder specimens. Each is a permanent commission — a seed string the generator grows into
 * the same painting forever. Change a seed here and the studio has commissioned a new work;
 * that is a design review, not a refactor. Curate candidates in the gongbi lab (#/lab/gongbi)
 * before pinning.
 *
 * HISTORY (2026-07-16). This ledger arrived with the hanging-scroll About draft and moved
 * here when the drafts were retired and their engine harvested as ornament for Daniel's
 * shipped page. Two commissions went with the drafts: `hero` (the scroll/ascent landing
 * branch) and `eden` (the summit crown, which collided with the BowerMark by construction —
 * see quality.matRect). Pigment appears on the SPECIMENS ONLY; the page's structure is
 * INK_SEPIA. The specimens' seeds are the founders' own names, which is the whole idea.
 *
 * ROUND 2, same day: the three DISCIPLINE FRONTISPIECES (`Architecture`, `Product Design`,
 * `Software`) are deleted, and `groupProjects` with them. They hung at 44px beside the work
 * index's discipline headings; Daniel: "Get rid of the small logo and extra product design
 * software architecture." At that size the aged-paper mount swallows the plant and the
 * frontispiece reads as a beige smudge — the ledger's own note said 44 was already the floor,
 * and the floor was still too small to be a painting. The index is flat now, so the headings
 * they sat beside are gone too. A project still carries its `discipline`; nothing draws it.
 */
import { type FounderId } from './projects';

export type Archetype = 'woody' | 'herbal';

export interface Commission {
  /** The permanent seed. The painting this grows is the slot's artwork, forever. */
  seed: string;
  /** Which plant architecture to grow (the generator's 50/50 coin is overridden). */
  kind: Archetype;
  /** 'mounted' composites the plant over an aged-paper squircle; 'transparent' hangs
   *  the plant directly on the vellum page (hero and colophon only). */
  mode: 'mounted' | 'transparent';
  /** Accessible description of the painted subject. */
  alt: string;
  /** 'pigment' (default) = the genome's palette; 'ink' = practice-blue only —
   *  how a commission hangs on a one-colour page (see engine/gongbi/garland.ts). */
  voice?: 'ink' | 'pigment';
}

export const PAINTINGS = {
  // THE MATCHED-WEIGHT PAIR (curated in #/lab/gongbi on 2026-07-16, 12 takes per family).
  //
  // The two specimens hang side by side, so they have to carry the same visual weight — and
  // the pipeline will NOT do that for you: passesGate (quality.ts) is a FLOOR (coverage >= 0.02
  // && ink >= 0.005), not a parity check, so two seeds can both pass and still hang as a full
  // plant next to a weed. Curation is the only thing that makes them a pair.
  //
  // Measured takes (coverage / ink / chroma):
  //   bower/clay-seifert     0.023 / 0.009 / 0.103  ← a full lilac specimen. KEPT.
  //   bower/daniel-guerra    0.028 / 0.018 / 0.134  ← RETIRED: spindly, two small buds on bare
  //                                                   stems. It passed the gate and still read
  //                                                   as a weed beside Clay's.
  //   bower/daniel-guerra-5  0.021 / 0.012 / 0.102  ← PINNED: violet blooms on a branching stem,
  //                                                   the same build and nearly the same measured
  //                                                   triple as Clay's take.
  //
  // Deliberately NOT chosen: bower/clay-seifert-8/2 (cornflower BLUE — the page just retired
  // blue, and pigment on a specimen should not walk it back in) and bower/daniel-guerra-3/3
  // (ink 0.040, far darker than anything on Clay's sheet).
  clay: {
    seed: 'bower/clay-seifert',
    kind: 'herbal',
    mode: 'mounted',
    alt: "Clay's specimen: a painted herbal nonflower grown from his name",
  },
  daniel: {
    seed: 'bower/daniel-guerra-5',
    kind: 'herbal',
    mode: 'mounted',
    alt: "Daniel's specimen: a painted herbal nonflower grown from his name",
  },
} as const satisfies Record<string, Commission>;

/** The two, as a list, for integrity tests and eager warm-up. */
export const ALL_COMMISSIONS: Commission[] = Object.values(PAINTINGS);

/**
 * Each founder's specimen, keyed on their stable id rather than matched out of their display
 * name. `Record<FounderId, ...>` means adding a third founder is a type error here, not a
 * person who quietly renders with no plant.
 */
export const FOUNDER_SPECIMENS: Record<FounderId, Commission> = {
  clay: PAINTINGS.clay,
  daniel: PAINTINGS.daniel,
};

/*
 * `groupProjects` / `WorkGroup` were deleted here on 2026-07-16 (round 2). They grouped the twelve
 * projects under the work index's three discipline headings, which no longer exist — the index is one
 * flat reverse-chronological list. Their only remaining caller was the index itself.
 */
