/**
 * projects.ts — the placeholder project set for the About / projects page.
 *
 * These are SCAFFOLD entries: real images and copy come later (see BlankFrame — every
 * image is intentionally blank for now). There are NO individual project pages; the whole
 * story lives in the master-detail on the About page — a curated set of 1..4 images per
 * project, a short description, and the "What we learned" takeaway that informed the work.
 *
 * The set is authored to tell one story: Clay and Daniel's five-year pursuit (2021 -> 2026)
 * across two fronts, grown-not-built architecture AND designing alongside AI, some projects
 * together, some apart, ending on Eden. `by`: 'clay+daniel' | 'daniel' | 'clay'.
 */
export type Author = 'clay+daniel' | 'daniel' | 'clay';

export interface Project {
  /** Two-digit index shown in the list + slider (01..10). */
  n: string;
  title: string;
  by: Author;
  year: string;
  /** How many images we will curate for this project (1..4). Blank frames for now. */
  images: number;
  /** One or two sentence description of the project. */
  description: string;
  /** The big takeaway: "What we learned" that informed our findings. */
  learned: string;
}

/** How each `by` value reads in the UI. */
export const AUTHOR_LABEL: Record<Author, string> = {
  'clay+daniel': 'Clay + Daniel',
  daniel: 'Daniel',
  clay: 'Clay',
};

/** Ten placeholder projects, ordered oldest -> newest so the list reads as a timeline. */
export const PROJECTS: Project[] = [
  {
    n: '01',
    title: 'Gridshell No.1',
    by: 'clay+daniel',
    year: '2021',
    images: 3,
    description: 'Our first relaxed timber gridshell, bent flat-to-curved and pinned into a doubly-curved shell.',
    learned: 'A shell wants to find its own form. Fighting the relaxation only adds material.',
  },
  {
    n: '02',
    title: 'Relaxed Lattice',
    by: 'daniel',
    year: '2021',
    images: 2,
    description: 'A constrained form-finding study, pushing a flat lattice until the joints bind.',
    learned: 'Letting the solver explore surfaced forms we would never have drawn by hand.',
  },
  {
    n: '03',
    title: 'Fork Joint',
    by: 'clay',
    year: '2022',
    images: 1,
    description: 'A single timber node resolved to one planar cut, so every strut meets on one plane.',
    learned: 'One planar cut per end turns a custom joint into a repeatable cut list.',
  },
  {
    n: '04',
    title: 'Canopy Study',
    by: 'clay+daniel',
    year: '2022',
    images: 4,
    description: 'Grown shade over a courtyard, tuned so the densest leaf falls where the sun is harshest.',
    learned: 'Design the shade for the worst hour, not the average one.',
  },
  {
    n: '05',
    title: 'Sunpath Pavilion',
    by: 'daniel',
    year: '2023',
    images: 3,
    description: "A shell driven end to end by the sun's path across the year.",
    learned: 'Let the sun path draw the roof, and the structure follows.',
  },
  {
    n: '06',
    title: 'Mitre Engine',
    by: 'clay',
    year: '2023',
    images: 2,
    description: 'A solver that turns any gridshell into a set of buildable mitred blanks.',
    learned: 'If the machine cannot cut it, it is not designed yet.',
  },
  {
    n: '07',
    title: 'Vellum Field',
    by: 'clay+daniel',
    year: '2024',
    images: 4,
    description: 'A field of climbing armatures, each a seed for a different planting.',
    learned: 'The model proposes, we still choose. AI widened the search, not the taste.',
  },
  {
    n: '08',
    title: 'Climbing Armature',
    by: 'daniel',
    year: '2024',
    images: 2,
    description: 'A computed frame built for a plant to climb, not only to stand.',
    learned: 'A frame that plans for growth outlives one that plans for a photo.',
  },
  {
    n: '09',
    title: 'Joint Floor',
    by: 'clay',
    year: '2025',
    images: 1,
    description: 'The 0.45m manufacturable limit, found by pushing joints until they failed.',
    learned: 'Know your smallest safe joint before you draw the first curve.',
  },
  {
    n: '10',
    title: 'Eden Prototype',
    by: 'clay+daniel',
    year: '2026',
    images: 4,
    description: 'The living pavilion, commissioned. Everything we learned, standing in a park.',
    learned: 'Five years of experiments collapse into one structure someone can sit under.',
  },
];
