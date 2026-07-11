/**
 * projects.ts — the project set for the About / projects page.
 *
 * These are REAL projects imported from Daniel's portfolio (Search by Assembly,
 * Synergy with the Cosmos, Dougherty Arts Center, Kuka Robotics), each with curated
 * images copied into /public/assets/projects. There are NO individual project pages;
 * the whole story lives in the master-detail LIST on the About page: a curated set of
 * images (hero first), a short description, and the "What we learned" takeaway.
 *
 * The set leads with the HERO project (Search by Assembly, the flagship), then the
 * rest. Clay has projects to add later, and Daniel has more of his own to add later.
 * `by`: 'clay+daniel' | 'daniel' | 'clay'.
 */
export type Author = 'clay+daniel' | 'daniel' | 'clay';

export interface ProjectImage {
  /** Public path under /assets/projects/... */
  src: string;
  /** Accessible description (required — every image carries alt text). */
  alt: string;
  /** Optional short caption shown under the image. */
  caption?: string;
}

export interface Project {
  /** Two-digit index shown in the list (01..). */
  n: string;
  title: string;
  by: Author;
  year: string;
  /** Curated images, HERO first (1..4). The first is shown large, the rest as thumbs. */
  images: ProjectImage[];
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

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  /** Portrait path under /assets/about, or null while a real photo is pending. */
  image: string | null;
}

/** The two people behind Bower, for the short "who we are" area on the About page. */
export const TEAM: TeamMember[] = [
  {
    name: 'Clay Seifert',
    role: 'Cofounder · design & vision',
    bio: 'Architect and designer. He holds the thesis behind Bower and drives the living-architecture vision, from the fabrication grammar to how a structure grows into its garden.',
    image: null, // portrait forthcoming
  },
  {
    name: 'Daniel Guerra',
    role: 'Cofounder · engine & systems',
    bio: 'Architect, product designer, and software engineer. He builds the generative engine and the systems behind it, turning the vision into something you can shape and price in real time.',
    image: '/assets/about/daniel-headshot.jpg',
  },
];

const A = '/assets/projects';

/** The imported set, HERO (Search by Assembly) first, then the rest. */
export const PROJECTS: Project[] = [
  {
    n: '01',
    title: 'Search by Assembly',
    by: 'clay+daniel',
    year: '2025',
    description:
      'Architectural precedent search rebuilt as something you compose and steer on a node canvas, not a single best-match ranking. Accepted to CAADRIA 2025.',
    learned:
      'Keep the designer in the loop and the machine widens the search without narrowing the taste.',
    images: [
      {
        src: `${A}/04-search-by-assembly/search-by-assembly-node-based-workflow-canvas.webp`,
        alt: 'The node-based query canvas, image, text, and attribute nodes wired into a graph',
        caption: 'A query, composed on the canvas',
      },
      {
        src: `${A}/04-search-by-assembly/search-by-assembly-nodes-and-relays-visual-graph.webp`,
        alt: 'Nodes and relays forming the query as a visual graph',
        caption: 'Nodes and relays, the query as a graph',
      },
      {
        src: `${A}/04-search-by-assembly/search-by-assembly-tri-slider-fusion-weights-control.webp`,
        alt: 'The tri-slider control setting fusion weights across visual, spatial, and contextual evidence',
        caption: 'The tri-slider, dialing what matters, live',
      },
      {
        src: `${A}/04-search-by-assembly/search-by-assembly-search-bar-ranked-precedent-results.webp`,
        alt: 'Ranked precedent results, each traceable to the motifs that matched',
        caption: 'Ranked precedents, each one legible',
      },
    ],
  },
  {
    n: '02',
    title: 'Synergy with the Cosmos',
    by: 'clay+daniel',
    year: '2023',
    description:
      'A building that grows its own structure, its walls farmed on site as bamboo and hemp, then cast into Plentify, a composite prototyped and tested +30% stronger than hempcrete.',
    learned:
      'Architecture can be grown in place and paced to the people who build it, not only trucked in and assembled.',
    images: [
      {
        src: `${A}/01-synergy/synergy-cosmos-courtyard-render.webp`,
        alt: 'Courtyard planted with the crops that become the walls around it',
        caption: 'Courtyards planted with the crops that become the walls',
      },
      {
        src: `${A}/01-synergy/synergy-cosmos-eidetic-aerial.webp`,
        alt: 'Aerial axonometric of the development woven into the neighbourhood fabric',
        caption: 'The whole development, cultivated from its own ground',
      },
      {
        src: `${A}/01-synergy/synergy-cosmos-living-walls.webp`,
        alt: 'Interior render of living walls of bamboo and hemp',
        caption: 'Inside, the planted walls keep growing',
      },
      {
        src: `${A}/01-synergy/synergy-cosmos-biocore-axon.webp`,
        alt: 'Axonometric of the Biocore system, planter cells aggregated into a building',
        caption: 'Biocore, how the three cells stack into a building',
      },
      {
        src: `${A}/01-synergy/synergy-cosmos-construction-3.webp`,
        alt: 'Bamboo culms laid into an emptied planter cell during construction',
        caption: 'Prototyping, bamboo culms laid into the emptied planter',
      },
      {
        src: `${A}/01-synergy/synergy-cosmos-construction-4.webp`,
        alt: 'Plentify composite poured and set into the planter cell formwork',
        caption: 'Prototyping, Plentify poured and set in its own formwork',
      },
      {
        src: `${A}/01-synergy/synergy-cosmos-compression-test.webp`,
        alt: 'A Plentify sample under compression on the MTS Insight testing machine',
        caption: 'Testing the mix under compression, +30% over hempcrete',
      },
      {
        src: `${A}/01-synergy/synergy-cosmos-building-elevation.webp`,
        alt: 'Building elevation showing the planter-cell aggregation across the whole block',
        caption: 'The block resolved, the aggregation across its length',
      },
    ],
  },
  {
    n: '03',
    title: 'Dougherty Arts Center',
    by: 'clay+daniel',
    year: '2024',
    description:
      'An arts center rebuilt from its own salvaged structure, 3D-printed catenary arches turning a floodplain site into shaded public space.',
    learned:
      'On a floodplain the honest move is to touch the ground lightly and give public space back.',
    images: [
      {
        src: `${A}/05-dougherty/dougherty-arts-center-catenary-entrance-skyline-money-shot.webp`,
        alt: 'The catenary arch entrances framing a runner with the downtown Austin skyline behind',
        caption: 'The catenary entrances open the building to the park',
      },
      {
        src: `${A}/05-dougherty/dougherty-arts-center-north-facade-perspective-austin-skyline.webp`,
        alt: 'The resolved north facade seen across the park with the Austin skyline behind',
        caption: 'North facade across the park, skyline beyond',
      },
      {
        src: `${A}/05-dougherty/dougherty-arts-center-structural-axonometric-timber-roof.webp`,
        alt: 'Axonometric of the catenary arch and timber roof structure read as one family',
        caption: 'The structural system read as one family',
      },
      {
        src: `${A}/05-dougherty/dougherty-arts-center-physical-model-perspective.webp`,
        alt: 'Photograph of the physical model against a neutral backdrop',
        caption: 'The physical model, proportion in the round',
      },
    ],
  },
  {
    n: '04',
    title: 'Kuka Robotics',
    by: 'daniel',
    year: '2026',
    description:
      'An industrial arm reframed as a drawing instrument: one script that sands metal, carves sand, plots ink, and draws with light.',
    learned:
      'Given a well-made tool and a thoughtful toolpath, a robot becomes an expressive partner, not automated labor.',
    images: [
      {
        src: `${A}/06-kuka-robotics/kuka-robotics-led-light-drawing-long-exposure.webp`,
        alt: 'Long-exposure photograph of the KUKA arm tracing a radial burst of LED light',
        caption: 'Light drawn in long exposure, the motion made visible',
      },
      {
        src: `${A}/06-kuka-robotics/kuka-robotics-metal-surface-sanding-end-effector.webp`,
        alt: 'KUKA arm with a sanding head working a dark metal panel on the worktable',
        caption: 'Metal-surface sanding, the arm at work',
      },
      {
        src: `${A}/06-kuka-robotics/kuka-robotics-ornamentation-pattern-metal-surface.webp`,
        alt: 'Finished concentric hexagonal ornamentation drawn in red ink on paper',
        caption: 'Plotted ornamentation, a concentric hexagonal pattern',
      },
      {
        src: `${A}/06-kuka-robotics/kuka-robotics-plotted-serpentine-drawing-resolved.webp`,
        alt: 'Completed serpentine ribbon drawing in red and magenta ink on paper',
        caption: 'The resolved serpentine drawing',
      },
    ],
  },
];
