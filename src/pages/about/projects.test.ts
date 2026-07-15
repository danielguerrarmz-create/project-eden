import { describe, it, expect } from 'vitest';
import { PROJECTS } from './projects';

/**
 * The short-viewport safety net (project-frame proposal, section 6B).
 *
 * The detail panel no longer scrolls: `overflow-y-auto` is gone, so a description that grows too
 * long would CLIP instead of scroll. These budgets — calibrated against the real worst cases with a
 * grace margin, not round numbers — turn "currently fits" into "cannot ship if it stops fitting."
 * The payoff line ("What we learned") also gets its own reserved fixed-height zone in the layout, so
 * pressure always hits the description first; this test is the hard floor underneath that.
 *
 * If a new project trips one of these, the fix is to tighten the copy, NOT to raise the budget —
 * the number is the guarantee. Raise it only after re-measuring the text column at 1366x768 and
 * 1280x800 and confirming the taller field still fits with the reserved payoff zone in place.
 */
const BUDGET = {
  /** Title sits on one row beside the Nº tag and meta; keep it to a single short line. */
  title: 30,
  /** The one description sentence. Today's longest is Robotic Factory at 314. */
  description: 330,
  /** The payoff / "What we learned" line. Today's longest is Robots as Instruments at 228. */
  learned: 260,
  /** venue + " · " + authors, the folded citation line. Today's longest is Archipedia at 84. */
  citation: 100,
} as const;

/** The citation exactly as the panel renders it: `${venue} · ${authors}`. */
function citationOf(p: (typeof PROJECTS)[number]): string {
  return p.paper ? `${p.paper.venue} · ${p.paper.authors}` : '';
}

describe('projects.ts — the detail panel fits without an inner scroll', () => {
  it.each(PROJECTS.map((p) => [p.n, p.title, p] as const))(
    '%s %s stays within every text budget',
    (_n, _title, p) => {
      expect(p.title.length, `title over ${BUDGET.title}`).toBeLessThanOrEqual(BUDGET.title);
      expect(p.description.length, `description over ${BUDGET.description}`).toBeLessThanOrEqual(
        BUDGET.description,
      );
      expect(p.learned.length, `learned over ${BUDGET.learned}`).toBeLessThanOrEqual(BUDGET.learned);
      expect(citationOf(p).length, `citation over ${BUDGET.citation}`).toBeLessThanOrEqual(
        BUDGET.citation,
      );
    },
  );

  it('every project carries at least one image (the plate frame needs a hero)', () => {
    for (const p of PROJECTS) {
      expect(p.images.length, `${p.n} ${p.title} has no images`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every image carries a finite, positive aspect ratio (the plate packer needs it)', () => {
    for (const p of PROJECTS) {
      for (const im of p.images) {
        expect(Number.isFinite(im.ratio) && im.ratio > 0, `${p.n} ${im.src} ratio ${im.ratio}`).toBe(
          true,
        );
      }
    }
  });
});
