/**
 * paintings.ts — the commission ledger and copy data for the hanging-scroll About page.
 *
 * The page hangs EXACTLY SEVEN paintings (the flower economy is a design rule, not a
 * shortage): the hero branch, three discipline frontispieces, the two founder specimens,
 * and the closing Eden branch. Each is a permanent commission — a seed string the
 * generator grows into the same painting forever. Change a seed here and the studio has
 * commissioned a new work; that is a design review, not a refactor. Curate candidates in
 * the gongbi lab (#/lab/gongbi) before pinning.
 *
 * Also here: the dated inscription (the crossed-paths story as a colophon — every line
 * sourced from projects.ts / TEAM, nothing invented) and the pure grouping function the
 * work sections and the plates index share. Pure data + pure functions only, so vitest
 * covers it in the node environment.
 */
import { DISCIPLINE_ORDER, PROJECTS, TEAM_CODA, type Discipline, type Project } from '../about/projects';

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
  hero: {
    seed: 'bower/five-years',
    kind: 'woody',
    mode: 'transparent',
    alt: 'Procedurally painted blossom branch in gongbi style, reaching down toward the page title',
  },
  clay: {
    seed: 'bower/clay-seifert',
    kind: 'herbal',
    mode: 'mounted',
    alt: "Clay's specimen: a painted herbal nonflower grown from his name",
  },
  daniel: {
    seed: 'bower/daniel-guerra',
    kind: 'herbal',
    mode: 'mounted',
    alt: "Daniel's specimen: a painted herbal nonflower grown from his name",
  },
  Architecture: {
    seed: 'bower/architecture',
    kind: 'woody',
    mode: 'mounted',
    alt: 'Architecture frontispiece: a painted woody nonflower branch on aged paper',
  },
  'Product Design': {
    seed: 'bower/product-design',
    kind: 'herbal',
    mode: 'mounted',
    alt: 'Product design frontispiece: a painted herbal nonflower on aged paper',
  },
  Software: {
    seed: 'bower/software',
    kind: 'herbal',
    mode: 'mounted',
    alt: 'Software frontispiece: a painted herbal nonflower on aged paper',
  },
  eden: {
    // Pinned to take 5 on 2026-07-16: takes 1–4 of bower/eden fail the ink gate
    // (see quality.ts), so the ladder landed here every session anyway — pinning
    // saves ~11s of worker time and names the actual painting.
    seed: 'bower/eden/5',
    kind: 'woody',
    mode: 'transparent',
    alt: 'A last painted blossom branch arching behind the Bower mark',
  },
} as const satisfies Record<string, Commission>;

/** The seven, as a list, for integrity tests and eager warm-up. */
export const ALL_COMMISSIONS: Commission[] = Object.values(PAINTINGS);

/**
 * The dated inscription: the crossed-paths story as five colophon entries. Every fact
 * is already public on this site — pulled from PROJECTS descriptions and the TEAM
 * provenance block — reworded only for rhythm. Do not add a fact here that projects.ts
 * or TEAM cannot back.
 */
export const INSCRIPTION: { year: string; text: string }[] = [
  {
    year: '2021',
    text: 'The paths cross at UT Austin, where Clay enrolls after three years drafting at Rick Wright Architects in Dallas.',
  },
  {
    year: '2022',
    text: "Flowerfield: Austin's first ecodistrict — net-zero, water treated on site, 155 homes rehoused as 630. The closest ancestor to Eden.",
  },
  {
    year: '2023',
    text: 'Plentify grows a building’s walls from bamboo and hemp; the composite tests 30% stronger than hempcrete. In Kenya, a $0.25 folded medical device reaches Moi Teaching Hospital, carried there by a team of fourteen students.',
  },
  {
    year: '2024',
    text: 'An arts center rebuilt lightly on a floodplain. Water infrastructure made public space on the Colorado. Resia grows to ten people through two accelerators, and a desk lamp gives a language model a body.',
  },
  {
    year: '2025',
    text: 'Two papers — AAG and ACADIA — on reading a building’s construction logic back out of its ruins. Six months at Rogers Partners in New York. A factory for growing and making, drawn as architecture.',
  },
  {
    year: '2026',
    text: 'Archipedia is submitted to ACM DIS, a third paper is accepted at CAADRIA, robots become instruments — and everything above grows into one place: Eden.',
  },
];

/** The inscription closes on the site's own summary line. */
export const INSCRIPTION_CODA = TEAM_CODA.line;

export interface WorkGroup {
  discipline: Discipline;
  projects: Project[];
}

/**
 * Group the twelve projects for the three work sections and the plates index:
 * disciplines in Daniel's order, projects by `n` (reverse-chronological display
 * order) within each. Pure so the node tests can pin it.
 */
export function groupProjects(projects: Project[] = PROJECTS): WorkGroup[] {
  return DISCIPLINE_ORDER.map((discipline) => ({
    discipline,
    projects: projects
      .filter((p) => p.discipline === discipline)
      .sort((a, b) => a.n.localeCompare(b.n)),
  }));
}
