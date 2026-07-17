/**
 * paintings.ts — what a commissioned gongbi painting IS. The ledger that used to live here is
 * empty, and deliberately so.
 *
 * THE LEDGER IS DELETED (2026-07-16, round 10, item 4a). It pinned two permanent commissions —
 * `bower/clay-seifert` and `bower/daniel-guerra-5`, the founders' own names grown into their own
 * specimens — and the founders frame was the only surface that hung them. Daniel cut both by their
 * printed captions: "Delete both right-side specimen paintings... Both gone, seed labels with
 * them." With the slot gone the seeds had no reader, and this file's own precedent says what
 * happens then. When the three discipline frontispieces were deleted in round 2, the rule was
 * written down and tested: *a commission nothing hangs is a painting the worker still queues and no
 * one ever sees* — delete it, do not merely stop rendering it. That rule now applies to the last two.
 * `PAINTINGS`, `ALL_COMMISSIONS`, `FOUNDER_SPECIMENS` and their test file went with them.
 *
 * WHAT SURVIVES, AND WHY THIS FILE STILL EXISTS: the `Commission` shape. It is not ledger-only —
 * the gongbi lab (`#/lab/gongbi`, the curation room) builds Commissions on the fly from a typed
 * seed family, and `FanPainting` takes one. So the page can still paint a commission; it just does
 * not pin any. If a slot is ever added back, the ledger returns here, and it should return because
 * a real surface asked for it.
 *
 * NOTE for whoever re-pins: a seed is a design review, not a constant (CLAUDE.md). `passesGate`
 * (engine/gongbi/quality.ts) is a FLOOR, not a parity check — two seeds can both pass and still
 * hang as a full plant next to a weed. Sweep takes in the lab and compare them by eye before
 * pinning anything here. The retired pair was curated that way, 12 takes per family.
 */

export type Archetype = 'woody' | 'herbal';

export interface Commission {
  /** The permanent seed. The painting this grows is the slot's artwork, forever. */
  seed: string;
  /** Which plant architecture to grow (the generator's 50/50 coin is overridden). */
  kind: Archetype;
  /** 'mounted' composites the plant over an aged-paper squircle; 'transparent' hangs
   *  the plant directly on the vellum page. */
  mode: 'mounted' | 'transparent';
  /** Accessible description of the painted subject. */
  alt: string;
  /** 'pigment' (default) = the genome's palette; 'ink' = practice-blue only —
   *  how a commission hangs on a one-colour page (see engine/gongbi/garland.ts). */
  voice?: 'ink' | 'pigment';
}

/*
 * `groupProjects` / `WorkGroup` were deleted here on 2026-07-16 (round 2). They grouped the twelve
 * projects under the work index's three discipline headings, which no longer exist — the index is one
 * flat reverse-chronological list. Their only remaining caller was the index itself.
 */
