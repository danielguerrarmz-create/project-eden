/**
 * projects.ts — the project set for the About / projects page.
 *
 * These are REAL projects imported from Daniel's portfolio (Search by Assembly,
 * Synergy with the Cosmos, Dougherty Arts Center, Kuka Robotics), each with curated
 * images copied into /public/assets/projects. There are NO individual project pages;
 * the whole story lives in the master-detail LIST on the About page: a curated set of
 * images (hero first), a short description, and the "What we learned" takeaway.
 *
 * DISPLAY ORDER (2026-07-12) is REVERSE CHRONOLOGICAL — most recent work first — and the
 * `n` index encodes it, so the number the reader sees IS the position. The array below is
 * still in authoring order; the page sorts by `n`. Clay has projects to add later, and
 * Daniel has more of his own to add later.
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
  /** How the image fills its tile. Renders (default) crop with 'cover'; paper figures
   *  and diagrams use 'contain' so nothing is cut off. */
  fit?: 'cover' | 'contain';
}

/** A published paper behind a project (the project IS the research). Renders a
 *  "read the paper" download framed in the project's text. */
export interface ProjectPaper {
  /** Where and when it was published, e.g. "AAG 2025 · MIT". */
  venue: string;
  authors: string;
  /** Public path to the downloadable PDF. */
  pdf: string;
  /** Human-readable file size for the download affordance, e.g. "PDF · 3.7 MB". */
  pdfSize: string;
}

export interface Project {
  /** Two-digit index shown in the list. It encodes the DISPLAY order, which is reverse
   *  chronological: 01 is the most recent work, and the numbers climb as you go back in
   *  time. Keep it in sync with `year` when a project is added. */
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
  /** Present when the project is a published paper: adds venue, authors, and a PDF. */
  paper?: ProjectPaper;
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
    role: 'Cofounder · design & research',
    bio: 'Architect and researcher at UT Austin. He leads Bower’s design and the living-architecture research it grew from.',
    image: null, // portrait forthcoming
  },
  {
    name: 'Daniel Guerra',
    role: 'Cofounder · engine & systems',
    bio: 'Architect, product designer, and engineer. He builds Bower’s generative engine and the systems around it.',
    image: '/assets/about/daniel-headshot.jpg',
  },
];

const A = '/assets/projects';

/** The imported set, HERO (Search by Assembly) first, then the rest. */
export const PROJECTS: Project[] = [
  {
    n: '02',
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
    paper: {
      venue: 'CAADRIA 2025',
      authors: 'Clay Seifert, Daniel Guerra',
      pdf: '',
      pdfSize: '',
    },
  },
  {
    n: '03',
    title: 'Synthetic Vision',
    by: 'clay',
    year: '2025',
    description:
      'A Vision Transformer is trained on a synthetic taxonomy of the operations that generate architectural form, extrusion, revolution, truncation, Boolean subtraction, then used to read those same operations back out of eroded photogrammetric fragments. It recovers how a form was built, not just what it is called.',
    learned:
      'The same premise, that a form’s geometry maps to how it is fabricated, is what lets Bower’s engine price a shape before it is ever cut.',
    paper: {
      venue: 'AAG 2025 · MIT',
      authors: 'Clay Seifert, Patrick Danahy',
      pdf: `${A}/08-synthetic-vision/aag-2025-synthetic-vision-seifert-danahy.pdf`,
      pdfSize: 'PDF · 3.7 MB',
    },
    images: [
      {
        src: `${A}/08-synthetic-vision/synthetic-vision-patch-probe-saliency-heatmaps.webp`,
        alt: 'Grid of saliency heatmaps over architectural fragments, warm colors marking where each geometric primitive is detected',
        caption: 'Patch-probe saliency, where each fragment reads as a known primitive',
        fit: 'contain',
      },
      {
        src: `${A}/08-synthetic-vision/synthetic-vision-56-class-geometry-taxonomy.webp`,
        alt: 'Grid of 56 line-drawn geometry classes, vaults, domes, cones, prisms, pyramids, and arches, each labelled',
        caption: 'The 56-class taxonomy of generative operations the model learns',
        fit: 'contain',
      },
      {
        src: `${A}/08-synthetic-vision/synthetic-vision-two-stage-vit-pipeline.webp`,
        alt: 'Diagram of the two-stage pipeline: a synthetic pretraining stage feeding a Vision Transformer with two task heads',
        caption: 'The two-stage pipeline, synthetic pretraining then fragment analysis',
        fit: 'contain',
      },
      {
        src: `${A}/08-synthetic-vision/synthetic-vision-umap-latent-geometry.webp`,
        alt: 'UMAP scatter plot of fragment descriptors colored by source building, clustering by shared geometry',
        caption: 'Fragments embedded by shared geometry, colored by building',
        fit: 'contain',
      },
    ],
  },
  {
    n: '04',
    title: 'Patterns Across Languages',
    by: 'clay',
    year: '2025',
    description:
      'The method scales across cultures: 158 fragments from Gothic, Romanesque, and Islamic monuments of the 11th to 14th centuries, mapped by their latent projective geometry rather than their style labels. It quantifies where distant traditions share a constructive grammar and where they diverge.',
    learned:
      'Turn an archive into evidence you can measure, not a catalogue you can only browse, and scale stops meaning sameness.',
    paper: {
      venue: 'ACADIA 2025 · Computing for Resilience',
      authors: 'Clay Seifert',
      pdf: `${A}/09-patterns-across-languages/acadia-2025-patterns-across-languages-seifert.pdf`,
      pdfSize: 'PDF · 12.9 MB',
    },
    images: [
      {
        src: `${A}/09-patterns-across-languages/patterns-medieval-fragments-ten-monuments.webp`,
        alt: 'Grid of photogrammetric fragment renders from ten medieval monuments across Islamic, Romanesque, and Gothic traditions',
        caption: 'Fragments from ten medieval monuments across three traditions',
        fit: 'contain',
      },
      {
        src: `${A}/09-patterns-across-languages/patterns-multiscale-saliency-fragment.webp`,
        alt: 'Multi-scale saliency rows over one fragment, showing which geometric primitives the model reads at each image scale',
        caption: 'Multi-scale saliency, the same fragment read at four resolutions',
        fit: 'contain',
      },
      {
        src: `${A}/09-patterns-across-languages/patterns-umap-latent-geometry-clusters.webp`,
        alt: 'UMAP scatter plot embedding the 158 fragments into a latent geometry space, colored by cluster',
        caption: 'The fragments embedded by shared geometry, not by style',
        fit: 'contain',
      },
      {
        src: `${A}/09-patterns-across-languages/patterns-style-foldchange-heatmaps.webp`,
        alt: 'Three log fold-change heatmaps comparing which geometric motifs are enriched between Gothic, Romanesque, and Islamic fragments',
        caption: 'Where the traditions diverge, motif by motif and scale by scale',
        fit: 'contain',
      },
    ],
  },
  {
    n: '07',
    title: 'Flowerfield',
    by: 'clay',
    year: '2022',
    description:
      "Austin's first ecodistrict: a high-density, low-rise housing community grown like nature, curving, flowing, and alive. It reaches net-zero energy and carbon neutrality, filters all of its water on site down to the city's blackwater, and lifts the block from 155 to 630 homes, with room for 2,000 more.",
    learned:
      'A building can carry the full complexity of a living system, its water, growth, and habitat, and house more people rather than fewer. This is the closest ancestor to Eden.',
    images: [
      {
        src: `${A}/07-flowerfield/flowerfield-biophilic-ecodistrict-hero-render.webp`,
        alt: 'Aerial-level render of the flowerfield ecodistrict, organic white buildings above a field of flowers and filtration ponds with the Austin skyline behind',
        caption: 'flowerfield, an ecodistrict grown like nature',
      },
      {
        src: `${A}/07-flowerfield/flowerfield-vaulted-pavilion-boardwalk-water.webp`,
        alt: 'People on a boardwalk crossing filtered water beneath the branching vaults of a flowerfield pavilion',
        caption: 'Under the vaults, boardwalks cross the filtered water',
      },
      {
        src: `${A}/07-flowerfield/flowerfield-watercolor-site-plan.webp`,
        alt: 'Watercolor site plan of flowerfield, buildings and lagoons drawn as organic petal-shaped plots',
        caption: 'The site plan, drawn as petals and lagoons',
      },
      {
        src: `${A}/07-flowerfield/flowerfield-exploded-systems-axonometric.webp`,
        alt: 'Exploded axonometric annotating the systems: wind scoops, solar panels, green roofs, geothermal floor heating, and 3D-printed hempcrete',
        caption: 'How it works, from wind scoops to 3D-printed hempcrete',
      },
      {
        src: `${A}/07-flowerfield/flowerfield-cherry-blossom-garden-people.webp`,
        alt: 'Residents walking through a spring garden of flowering trees and wildflowers along a stream in flowerfield',
        caption: 'Spring in the district, the planting doing the cooling',
      },
      {
        src: `${A}/07-flowerfield/flowerfield-organic-perforated-facade-boardwalk.webp`,
        alt: 'Close view of a flowerfield building, its curved white facade perforated with organic openings, meeting a timber boardwalk',
        caption: 'The perforated organic facade meets the boardwalk',
      },
      {
        src: `${A}/07-flowerfield/flowerfield-site-section-terrain.webp`,
        alt: 'Long site section of flowerfield showing the buildings settling into the rolling terrain among trees',
        caption: 'Site section, the buildings settling into the terrain',
      },
    ],
  },
  {
    n: '06',
    title: 'Synergy with the Cosmos',
    by: 'clay+daniel',
    year: '2023',
    description:
      'A building that grows its own structure, its walls farmed on site as bamboo and hemp, then cast into Plentify, a composite prototyped and tested +30% stronger than hempcrete.',
    learned:
      'Architecture can be grown in place and paced to the people who build it, not only trucked in and assembled.',
    images: [
      {
        src: `${A}/01-synergy/synergy-cosmos-growth-loop.gif`,
        alt: 'Looping animation of the building growing from bare structure to fully planted, bamboo and hemp filling in the planter cells',
        caption: 'Grown in, frame by frame',
      },
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
    n: '05',
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
    n: '01',
    title: 'KUKA Robotics',
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
