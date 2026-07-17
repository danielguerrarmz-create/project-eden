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

/**
 * THE ACM DIS 2026 CLAIM, AND WHAT A TEST CAN HONESTLY DO ABOUT IT.
 *
 * On 2026-07-17 Daniel ruled that **Archipedia was never submitted to ACM DIS 2026** — they meant to
 * and ran out of time. The claim had been live on the public page in three places (his bio, the
 * project description, and `paper.venue`) plus a provenance comment asserting nothing was inferred.
 *
 * BE CLEAR ABOUT WHAT THESE TESTS CATCH, because the obvious guard is the one that does not work:
 *
 *   - **NO TEST CAN KNOW WHETHER A PAPER WAS SUBMITTED.** That is a fact about the world. Only Daniel
 *     had it, and the only reason the page was wrong for rounds is that nobody asked him.
 *   - **A BIO-VERSUS-LEDGER CONSISTENCY CHECK WOULD NOT HAVE CAUGHT IT EITHER, and this is the whole
 *     lesson.** The bio said "ACM DIS 2026" and `paper.venue` said "ACM DIS 2026 · submitted". They
 *     AGREED. Two places, one fact, perfectly consistent, and both false. Consistency is not truth,
 *     and a cross-check between two copies of the same claim can only ever find a TYPO. That is the
 *     limit of the "one fact, two places" guard above, stated out loud so the green does not get read
 *     as "the bios are true".
 *
 * So the first test below is not clever and is not meant to be: it PINS THE CORRECTION. The lie is
 * still written down in `bower-docs/handoffs/2026-07-12-…` (corrected in place, but the words survive
 * in git), so the realistic way it comes back is a future editor "restoring" a fact they found in a
 * private doc. This makes that loud instead of silent. The second one catches real drift.
 */
describe('the ACM DIS 2026 claim stays dead', () => {
  const surfaces = (): string[] => [
    ...TEAM.flatMap((m) => m.facts.map((f) => `${m.name} / ${f.label}: ${f.value}`)),
    ...PROJECTS.flatMap((p) => [
      `${p.title} description: ${p.description}`,
      ...(p.paper ? [`${p.title} paper: ${p.paper.title ?? ''} ${p.paper.venue} ${p.paper.authors}`] : []),
      ...(p.awards ?? []).map((a) => `${p.title} award: ${a}`),
    ]),
  ];

  it('guards the probe: there is reader-facing copy to search', () => {
    // Without this the filters below iterate an empty list and report success — this file's own
    // original sin (`p.id`), and the harness that printed "PASS across all 0 projects".
    expect(surfaces().length).toBeGreaterThan(20);
    expect(surfaces().some((s) => s.includes('CAADRIA 2026'))).toBe(true);
  });

  it('no reader-facing string claims ACM DIS anywhere', () => {
    const hits = surfaces().filter((s) => /\bACM\b|\bDIS\s*20\d\d/i.test(s));
    expect(
      hits,
      `\nArchipedia was NEVER submitted to ACM DIS 2026 (Daniel, 2026-07-17). It is one paper and it\n` +
        `went to CAADRIA 2026, accepted. If a private handoff told you otherwise, that doc is wrong and\n` +
        `is corrected at bower-docs/handoffs/2026-07-12-…:95.\n${hits.join('\n')}\n`,
    ).toEqual([]);
  });

  it('Archipedia carries the CAADRIA paper, accepted, with its real title and four authors', () => {
    const arch = PROJECTS.find((p) => p.title === 'Archipedia');
    expect(arch?.paper).toBeDefined();
    expect(arch!.paper!.venue).toBe('CAADRIA 2026 · accepted');
    expect(arch!.paper!.title).toBe(
      'Multi-Modal Precedent Retrieval: Patch-Aware and Tri-Scalar Rank Weighted Guidance for Design Search',
    );
    expect(arch!.paper!.authors).toBe('Clay Seifert, Daniel Guerra, Armaan Kokan, Patrick Danahy');
    // NOT FABRICATED, AND THAT IS THE ASSERTION. There is no PDF. An empty string here is the honest
    // state; a plausible "PDF · 2.4 MB" next to a dead link is the failure this pins.
    expect(arch!.paper!.pdf).toBe('');
    expect(arch!.paper!.pdfSize).toBe('');
  });

  it('every venue a bio names exists in the ledger (drift, not truth)', () => {
    // WOULD NOT HAVE CAUGHT THE DIS BUG — see the note above. It catches the NEXT thing: one of the
    // three copies of this fact getting updated and the others not.
    const ledger = PROJECTS.filter((p) => p.paper).map((p) => p.paper!.venue);
    const bios = TEAM.flatMap((m) => m.facts.map((f) => `${m.name}: ${f.value}`));
    const orphans: string[] = [];
    for (const bio of bios) {
      for (const [, venue] of bio.matchAll(/\b([A-Z]{3,7}(?: [A-Z]{2,4})? 20\d\d)\b/g)) {
        if (!ledger.some((v) => v.startsWith(venue))) orphans.push(`"${venue}" in ${bio}`);
      }
    }
    expect(
      orphans,
      `\nA bio names a venue no paper in the ledger claims. Either the ledger lost a paper or the bio\n` +
        `invented one. Ledger venues: ${ledger.join(' | ')}\n${orphans.join('\n')}\n`,
    ).toEqual([]);
  });
});
