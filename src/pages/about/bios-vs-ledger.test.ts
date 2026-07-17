import { describe, it, expect } from 'vitest';
import { TEAM, PROJECTS, type FounderId } from './projects';

/**
 * THE BIOS RESTATE PROJECT FACTS BY HAND AND NOTHING LINKS THEM TO THE LEDGER.
 *
 * This test is the guard CLAUDE.md has been proposing for two rounds and nobody built:
 *
 *   "Cheap fix if it recurs (proposed, not built): a test asserting no `TEAM` fact mentions a
 *    project whose `by:` excludes that founder — a noun list per project is enough to catch the
 *    class."
 *
 * It recurred, so here it is. The history it exists for:
 *
 *   - `LLO: Dream Machine` was re-attributed to Clay in `projects.ts` on 2026-07-15. The sentence
 *     claiming the desk lamp sat in DANIEL's bio until round 5 found it by eye. One fact, two
 *     places, one owner, and nothing propagated.
 *   - CLAUDE.md on why it matters: "Misattributing a cofounder's work on the company's own About
 *     page is the worst class of bug this page has, and it is silent — nothing fails, it just reads
 *     wrong."
 *
 * Silent is the operative word. It is not a type error, it does not crash, the page renders
 * beautifully, and the only detector so far has been Daniel reading his own bio and noticing
 * somebody else's lamp in it. Round 10 rewrote his bio, which is exactly when this class lands.
 *
 * THE MIRROR CASE IS ALSO A BUG and is easier to miss: wording a SHARED project (`by: 'clay+daniel'`)
 * as sole authorship in one founder's bio. That is why `clay+daniel` projects are not simply skipped
 * below — see the note on the noun list.
 *
 * WHY A CURATED NOUN LIST rather than matching titles. "Resia" as a title works, but the defect
 * wears everyday clothes: the desk-lamp sentence never said "LLO: Dream Machine", it said "a desk
 * lamp that gives a language model a body". Matching titles would have sailed straight past the one
 * bug this test is named after. The nouns are the words a bio would ACTUALLY reach for.
 */

/**
 * The words that give a project away, keyed by TITLE. Deliberately hand-written: a generated list
 * would match the ledger's vocabulary rather than a bio's.
 *
 * KEYED BY TITLE BECAUSE THERE IS NO STABLE KEY, which is worth knowing before you trust it.
 * `Project` has no `id` — it has `n` (which renumbers whenever projects merge; KUKA and Texas
 * Robotics merged into one entry last round) and `title` (display copy, which can be reworded). So
 * both candidates can move under this map. Title is the lesser evil, and the coverage tests below
 * turn a rename into a loud failure instead of a silent gap. `TeamMember` has exactly this warning
 * on `FounderId` already: "name is display copy... matching on it silently grows the wrong specimen".
 * The projects never got the same treatment.
 *
 * The first draft of this file keyed on `p.id`, which DOES NOT EXIST. Every lookup returned
 * undefined, every project hit the `continue`, and the main assertion below iterated to zero
 * comparisons and passed. A guard that checks nothing and reports green — the exact thing this file
 * exists to prevent, in the file itself, on the first try. The coverage test caught it.
 *
 * ADD TO THIS when you add a project.
 */
const TELLS: Record<string, string[]> = {
  Archipedia: ['archipedia', 'precedent search'],
  'Robots as Instruments': ['kuka', 'robot arm', 'texas robotics'],
  'Robotic Factory': ['robotic factory'],
  'Synthetic Vision': ['synthetic vision'],
  'Patterns Across Languages': ['patterns across languages'],
  'LLO: Dream Machine': ['desk lamp', 'dream machine', 'gives a language model a body'],
  Resia: ['resia', 'remodeling platform', 'ai remodel'],
  'Dougherty Arts Center': ['dougherty', 'arts center'],
  'Hydraulic Commons: Water Infrastructure': ['hydraulic commons', 'water infrastructure'],
  Plentify: ['plentify'],
  'Origami Medical Device': ['origami', 'medical device', 'kenya', 'teaching hospital'],
  Flowerfield: ['flowerfield'],
};

const authorsOf = (by: string): FounderId[] =>
  by.split('+').filter((p): p is FounderId => p === 'clay' || p === 'daniel');

const bioText = (id: FounderId): string => {
  const m = TEAM.find((t) => t.id === id);
  if (!m) throw new Error(`no TEAM member ${id}`);
  return m.facts.map((f) => `${f.label} ${f.value}`).join(' ').toLowerCase();
};

describe('no bio claims a project its owner does not own', () => {
  it('has both founders and the full ledger (guards the probe)', () => {
    // Without this, every assertion below iterates an empty list and reports success.
    expect(TEAM.map((t) => t.id).sort()).toEqual(['clay', 'daniel']);
    expect(PROJECTS.length).toBeGreaterThan(8);
  });

  it('THE RULE: a founder\'s bio never mentions a project attributed away from them', () => {
    const violations: string[] = [];
    for (const p of PROJECTS) {
      const owners = authorsOf(p.by);
      const tells = TELLS[p.title];
      if (!tells) continue; // reported by the coverage test below
      for (const founder of ['clay', 'daniel'] as const) {
        if (owners.includes(founder)) continue; // it is theirs; saying so is the point of a bio
        const text = bioText(founder);
        for (const tell of tells) {
          if (text.includes(tell.toLowerCase())) {
            violations.push(
              `${founder}'s bio says "${tell}" but ${p.title} (n:${p.n}) is by: '${p.by}'. ` +
                `Either the bio is claiming a cofounder's work, or projects.ts has the attribution wrong. ` +
                `One of the two is a lie on the company's own About page.`,
            );
          }
        }
      }
    }
    expect(violations, `\n${violations.join('\n')}\n`).toEqual([]);
  });

  it('every project is covered by the noun list, so a new one cannot be silently unguarded', () => {
    // The failure mode this catches: someone adds a project, never adds its tells, and the test
    // above keeps passing while covering less and less. A guard that quietly shrinks is worse than
    // no guard, because the green still reads as "checked". (This is the 2026-07-16 session's fifth
    // trap wearing a different hat: the blue tripwire "lost half its coverage" exactly this way.)
    const missing = PROJECTS.filter((p) => !TELLS[p.title]).map((p) => p.title);
    expect(
      missing,
      `these projects have no entry in TELLS and are therefore unguarded:\n${missing.join('\n')}\n` +
        `Add the words a bio would actually use for them.`,
    ).toEqual([]);
  });

  it('the noun list has no entries for projects that no longer exist', () => {
    // The other direction: a stale tell guards nothing and hides that the project it named is gone.
    const titles = new Set(PROJECTS.map((p) => p.title));
    const stale = Object.keys(TELLS).filter((k) => !titles.has(k));
    expect(stale, `TELLS names projects that are not in PROJECTS: ${stale.join(', ')}`).toEqual([]);
  });
});
