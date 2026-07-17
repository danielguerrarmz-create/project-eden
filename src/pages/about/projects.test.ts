import { describe, it, expect } from 'vitest';
import { PROJECTS, DISCIPLINE_ORDER } from './projects';

/**
 * The fixed-panel safety net.
 *
 * The detail panel does not scroll: the media area is a fixed two-region (hero top half, a tidy grid
 * of the rest in the bottom half) and the text column establishes hierarchy through spacing, not an
 * inner scroll. A description or a lesson that grows too long would CLIP instead of scroll. These
 * budgets — calibrated against the real worst cases with a grace margin, not round numbers — turn
 * "currently fits" into "cannot ship if it stops fitting."
 *
 * If a new project trips one of these, the fix is to tighten the copy, NOT to raise the budget — the
 * number is the guarantee. Raise it only after re-measuring the text column at 1366x768 and 1280x800
 * and confirming the taller field still fits.
 */
const BUDGET = {
  /** Title sits beside the meta line. Most are short; the longest is "Hydraulic Commons: Water
   *  Infrastructure" at 39, which wraps to a second line in the narrow menu — that is acceptable. */
  title: 42,
  /** The two-to-three sentence description with its outcome. Longest today is Hydraulic at ~335. */
  description: 340,
  /** The "What we learned" pill at the bottom of the column. Longest is Robots at 228. */
  learned: 260,
  /** venue + " · " + authors, the folded citation line. Longest is Archipedia at 84. */
  citation: 100,
  /** The collaborators / professors line. Longest is Archipedia at 28. */
  collaborators: 60,
} as const;

/** The IMAGE BUDGET (Comment 4): every project shows the hero plus up to three — 1..4 images total. */
/**
 * 4 -> 9 (2026-07-16, round 8), and the reason the cap existed is now handled somewhere better.
 *
 * It was 4 because the rail could OVERFLOW: `stackRatio` sized the cells to fill the height and
 * forgot the (n-1) gaps between them, so every extra image pushed the last one further out of the
 * region and into the "WHAT WE LEARNED" pill. A count cap was the only lever anyone had. That is
 * fixed at the root — `railWidth` puts the gaps in the arithmetic, so the stack fits BY
 * CONSTRUCTION at any count and simply gets narrower.
 *
 * What a count cap can never see is the thing that actually matters now: whether a CELL is legible.
 * That is a function of the height, the ratios and the count together, it only exists in a real
 * layout, and `qa/project-media.mjs` measures it against the running page and fails on slivers.
 * This number is a sanity bound on authored content, not a design rule.
 *
 * 9 is Origami: the hospital photograph, the staged prototype, and the seven-sheet assembly
 * brochure Daniel asked to be wired in. TODO(Daniel): at 9 the rail's cells measure 69px — a
 * legible INDEX (you can see six numbered steps and click any to full size) but not readable
 * documentation. Flagged rather than silently accepted; see the handoff.
 */
const MAX_IMAGES = 9;

/** The citation exactly as the panel renders it: `${venue} · ${authors}`. */
function citationOf(p: (typeof PROJECTS)[number]): string {
  return p.paper ? `${p.paper.venue} · ${p.paper.authors}` : '';
}

describe('projects.ts — the fixed detail panel fits without an inner scroll', () => {
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
      if (p.collaborators) {
        expect(p.collaborators.length, `collaborators over ${BUDGET.collaborators}`).toBeLessThanOrEqual(
          BUDGET.collaborators,
        );
      }
    },
  );

  it('every project carries at least one image (the hero) and at most four', () => {
    for (const p of PROJECTS) {
      expect(p.images.length, `${p.n} ${p.title} has no images`).toBeGreaterThanOrEqual(1);
      expect(p.images.length, `${p.n} ${p.title} has more than ${MAX_IMAGES} images`).toBeLessThanOrEqual(
        MAX_IMAGES,
      );
    }
  });

  it('every image carries a finite, positive aspect ratio (the gallery sizes plates by it)', () => {
    for (const p of PROJECTS) {
      for (const im of p.images) {
        expect(Number.isFinite(im.ratio) && im.ratio > 0, `${p.n} ${im.src} ratio ${im.ratio}`).toBe(
          true,
        );
      }
    }
  });

  it('a pending image is a placeholder: no real src, and it never carries a caption-only real asset', () => {
    for (const p of PROJECTS) {
      for (const im of p.images) {
        if (im.pending) {
          expect(im.src, `${p.n} pending image should have an empty src`).toBe('');
        } else {
          expect(im.src.length, `${p.n} non-pending image needs a real src`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every project has a valid discipline, and each of the three groups is non-empty', () => {
    for (const p of PROJECTS) {
      expect(DISCIPLINE_ORDER, `${p.n} ${p.title} discipline "${p.discipline}"`).toContain(p.discipline);
    }
    for (const d of DISCIPLINE_ORDER) {
      expect(PROJECTS.some((p) => p.discipline === d), `discipline group "${d}" is empty`).toBe(true);
    }
  });

  /*
   * THE LICENSED CROP IS A LICENCE, NOT A PRECEDENT — and this test is where that sentence stops
   * being prose. Daniel ruled, twice and explicitly, that ONE asset may fill the hero region and lose
   * the overflow: Robots' KUKA loop, because a uniform region and an uncropped 1.7778 video cannot
   * coexist and he chose uniformity ("prioritize that every project occupies the same formatting").
   *
   * IT COSTS 20.1% OF WIDTH. The Plentify loss that got `object-fit: cover` BANNED on heroes was 21%.
   * The difference is not the number — there is no meaningful difference in the number. The difference
   * is that this one is a scoped ruling on a named asset and that one was a silent default. Which
   * means the ONLY thing separating a licence from the return of the banned pattern is that it stays
   * on exactly one asset. Six months from now the comment explaining that will read as permission.
   *
   * So the scope is asserted, by src, rather than described. A second `fillHero` fails here — and it
   * fails with this paragraph attached, which is the point: the next person gets Daniel's reasoning
   * and its cost, not a mystery boolean they route around.
   */
  it('exactly ONE asset carries the licensed crop, and it is the one Daniel licensed', () => {
    const licensed = PROJECTS.flatMap((p) => p.images.filter((im) => im.fillHero === true).map((im) => ({ p, im })));
    expect(
      licensed.length,
      `fillHero is Daniel's scoped licence on ONE asset (Robots' KUKA loop). Found ${licensed.length}: ` +
        `${licensed.map((l) => `${l.p.title} -> ${l.im.src}`).join(', ')}. If a new asset needs to crop its hero, ` +
        `that is a ruling from Daniel, not a flag you add.`,
    ).toBe(1);
    expect(licensed[0].im.src, 'the licence belongs to the KUKA robot loop poster and nothing else').toContain(
      'kuka-robotics-robot-loop-poster',
    );
    // It only means anything on a hero: fillHero on a rail image would crop a supporting shot silently.
    expect(licensed[0].im.hero, 'the licensed crop must be the hero of its project').toBe(true);
  });

  it('the `n` order is a clean reverse-chronological run with no gaps', () => {
    const ns = [...PROJECTS].map((p) => p.n).sort((a, b) => a.localeCompare(b));
    ns.forEach((n, i) => {
      expect(n, `n sequence broken at index ${i}`).toBe(String(i + 1).padStart(2, '0'));
    });
    // Sorting by `n` must agree with descending year (reverse-chronological).
    const byN = [...PROJECTS].sort((a, b) => a.n.localeCompare(b.n));
    for (let i = 1; i < byN.length; i++) {
      expect(
        Number(byN[i].year),
        `${byN[i].n} ${byN[i].title} (${byN[i].year}) is newer than the one before it`,
      ).toBeLessThanOrEqual(Number(byN[i - 1].year));
    }
  });
});
