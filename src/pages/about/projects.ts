/**
 * projects.ts — the project set for the About / projects page.
 *
 * These are REAL projects imported from Daniel's portfolio (Archipedia, Plentify,
 * Dougherty Arts Center, Kuka Robotics), each with curated images copied into
 * /public/assets/projects. There are NO individual project pages; the whole story lives
 * in the master-detail LIST on the About page: a curated set of images (hero first), a
 * short description with a clear outcome, awards/publications, collaborators, and the
 * "What we learned" takeaway rendered as a pill.
 *
 * DISPLAY ORDER (2026-07-15) is REVERSE CHRONOLOGICAL — most recent work first — and the
 * `n` index encodes it, so the number the reader sees IS the position. The array below is
 * authored in `n` order; the page sorts by `n`. Clay has projects to add later, and Daniel
 * has more of his own to add later.
 * `by`: 'clay+daniel' | 'daniel' | 'clay'.
 */
export type Author = 'clay+daniel' | 'daniel' | 'clay';

/** The primary discipline a project sits under, for the grouped project menu. Many projects touch more
 *  than one; this is its LEAD. Groups render in this order: Architecture, Product Design, Software. */
export type Discipline = 'Architecture' | 'Product Design' | 'Software';

/** The order the discipline groups appear in the menu (Daniel's order). */
export const DISCIPLINE_ORDER: Discipline[] = ['Architecture', 'Product Design', 'Software'];

/** A moving hero. `src` is the POSTER still (also what the thumbnail and the lightbox's
 *  layout morph use), and the sources play in place of it. `rate` is the playback rate:
 *  under 1 the loop reads slower and calmer than the source render. */
export interface ProjectVideo {
  mp4: string;
  webm?: string;
  rate?: number;
}

export interface ProjectImage {
  /** Public path under /assets/projects/... For a video this is the poster still. Empty for a
   *  `pending` placeholder. */
  src: string;
  /** Intrinsic aspect ratio (width / height) of the asset, MEASURED from the file, not guessed.
   *  The gallery reads it where it matters. Hardcoded rather than measured on load so the layout is
   *  deterministic at first paint. For a `pending` placeholder it just sizes the plate. If an asset is
   *  swapped, re-measure and update this. */
  ratio: number;
  /** Accessible description (required — every image carries alt text). */
  alt: string;
  /** Optional short caption shown under the image. */
  caption?: string;
  /** How the image fills its tile. Renders (default) crop with 'cover'; paper figures
   *  and diagrams use 'contain' so nothing is cut off. */
  fit?: 'cover' | 'contain';
  /** HERO SELECTION. Flag ONE image per project as the hero — the large lead image that fills the
   *  TOP HALF of the media area. If none is flagged, the FIRST image in the array is the hero. */
  hero?: boolean;
  /** Present when this "image" is really a looping video. */
  video?: ProjectVideo;
  /** Placeholder tile: no asset yet. Renders an "Image to come" plate instead of an <img>/<video>,
   *  is non-interactive (never opens the lightbox), and is excluded from the lightbox set. `src` may be
   *  empty; `ratio` still sizes the plate. Used to scaffold an asset Daniel will drop in later. */
  pending?: boolean;
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
   *  time. Keep it in sync with `year` when a project is added — no gaps. */
  n: string;
  title: string;
  by: Author;
  /** Primary discipline, for the grouped project menu (Architecture / Product Design / Software). */
  discipline: Discipline;
  year: string;
  /** Curated images, HERO first (1..4 total). The hero fills the top half of the media area; the
   *  rest sit below it as a small tidy grid. Trimmed to the strongest — no hidden overflow. */
  images: ProjectImage[];
  /** Two to three sentence description with a clear outcome. */
  description: string;
  /** The big takeaway: "What we learned", rendered as the pill at the bottom of the text column. */
  learned: string;
  /** Awards or recognitions, one per line. Rendered in the detail panel's "Awards and publications"
   *  stage alongside any `paper`. Mostly empty; the field exists so adding one is a one-line change. */
  awards?: string[];
  /** Collaborators and professors on the project — the people beyond the founders. Sourced from real
   *  data only (e.g. a paper's `authors` minus the founder); left undefined where there is no record
   *  rather than inventing names. Rendered in its own stage between awards and the lesson. */
  collaborators?: string;
  /** Present when the project is a published paper: adds venue, authors, and a PDF. */
  paper?: ProjectPaper;
}

/** How each `by` value reads in the UI. */
export const AUTHOR_LABEL: Record<Author, string> = {
  'clay+daniel': 'Clay + Daniel',
  daniel: 'Daniel',
  clay: 'Clay',
};

/** One fact hung off a founder's stem on a leader line, botanical-plate style: a mono label
 *  (the specimen part) and the fact itself. Order is the reading order down the stem. */
export interface TeamFact {
  label: string;
  value: string;
}

/** A founder's stable key. `name` is display copy — it can be reworded, and matching on it
 *  (`name.startsWith('Clay')`) silently grows the wrong specimen. Key on this instead. */
export type FounderId = 'clay' | 'daniel';

export interface TeamMember {
  id: FounderId;
  name: string;
  role: string;
  /** The facts that hang off this founder's stem. Every one is sourced, none inferred — see the
   *  provenance note on TEAM below. */
  facts: TeamFact[];
  /** Portrait path under /assets/about, or null while a real photo is pending. */
  image: string | null;
}

/** The two people behind Bower.
 *
 * PROVENANCE — every fact below, and where it came from. Nothing here is inferred.
 *   - Public already, from this file: the roles; Clay's UT Austin enrollment and the two papers
 *     (Synthetic Vision, Patterns); the Kenya device and its fourteen-student team (Origami);
 *     Plentify's +30% composite; the LLO lamp.
 *   - From the private resume handoff `docs/handoffs/2026-07-12-about-sequence-frame-system-and-
 *     real-resumes.md` (Daniel authorized these for the public page on 2026-07-14): Rick Wright
 *     Architects, Dallas, 2020 to 2023; TestFit, 2023; Resia AI, 2023 to 2025, founder, two
 *     accelerators, ten people at peak; Rogers Partners, New York, June to December 2025.
 *   - From Clay's private memo `docs/handoff-clay-2026-07-03.md`: the "people, narrative, demand"
 *     / "engine, demo, numbers" split of this application round. Clay's own words.
 *   - The CAADRIA 2026 acceptance is named in the same resume handoff.
 *
 * NOTE for the next editor: the founders proposal drafted Daniel's Rogers Partners stint as "a
 * year". The resume says June to December 2025. The resume wins; do not restore "a year".
 *
 * TODO(Daniel): Daniel's robotics facts are deliberately ABSENT from his stem. The KUKA work is now
 * attributed to Daniel in the merged n:02 project (shared with Clay's Texas Robotics half); restore a
 * "taught a robot arm to draw with light" line to his stem only once you confirm you want it public. */
export const TEAM: TeamMember[] = [
  {
    id: 'clay',
    name: 'Clay Seifert',
    role: 'Cofounder · design & research',
    // Comment 5 (2026-07-15): real headshot staged at public/assets/about/clay-seifert.jpg.
    image: '/assets/about/clay-seifert.jpg',
    facts: [
      {
        label: 'Trained',
        value:
          'Architecture and research at UT Austin, enrolled 2021. Before that, three years drafting at Rick Wright Architects in Dallas.',
      },
      {
        label: 'Built',
        value:
          'Founded Resia, an AI remodeling platform, and grew it to ten people through two accelerators. Product development at TestFit before that.',
      },
      {
        label: 'Published',
        value:
          'Two papers on reading a building’s construction logic back out of its ruins, at AAG 2025 and ACADIA 2025. A third is accepted at CAADRIA 2026.',
      },
      { label: 'This round', value: 'The people, the narrative, the demand.' },
    ],
  },
  {
    id: 'daniel',
    name: 'Daniel Guerra',
    role: 'Cofounder · engine & systems',
    image: '/assets/about/daniel-headshot.jpg',
    facts: [
      {
        label: 'Trained',
        value:
          'Architecture, product design, and engineering. Six months at Rogers Partners in New York, June to December 2025.',
      },
      {
        label: 'Built',
        value:
          'A $0.25 folded medical device for a teaching hospital in Kenya, transferred for clinical deployment, directing a team of fourteen students to get it there.',
      },
      {
        label: 'Also',
        value:
          'A desk lamp that gives a language model a body, and a load-bearing composite grown from bamboo and hemp, tested 30% stronger than hempcrete.',
      },
      { label: 'This round', value: 'The engine, the demo, the numbers.' },
    ],
  },
];

/**
 * The coda: the one line the whole timeline lands on.
 *
 * ROUND 5 (2026-07-16) — `kicker` and `line` are DELETED, on Daniel's instruction: "Go ahead and
 * remove the 'Crossed paths, 2021' and the 'Since then...' keep only the 'Why bet on us..'".
 * Recover with: git show ef11345 -- src/pages/about/projects.ts
 *
 *   kicker: 'Crossed paths, 2021'
 *   line:   'Since then: an ecodistrict, an arts center on a floodplain, a composite grown from
 *            bamboo and hemp, and the papers above.'
 *
 * Deleted rather than left unrendered, because a constant nothing reads is a comment with extra
 * steps. The `line` was an inventory of the project set, and the project set is now right below it
 * in full — it was saying, worse, what the work says itself.
 */
export const TEAM_CODA = {
  payoffLabel: 'Why bet on us',
  payoff: 'The obsession is real, and it is old.',
};

const A = '/assets/projects';

/**
 * The imported set. Display order is by `n` (reverse-chronological), authored below in that order.
 * Within each project the images lead with the hero (the FIRST image by default).
 *
 * IMAGE BUDGET (Comment 4, 2026-07-15): each project carries 1–4 images TOTAL — the hero plus up to
 * three. Trimmed to the strongest; the media area shows all of them (hero top half, rest in a tidy
 * grid below) with no hidden overflow. To pick a different hero than the first, add `hero: true` to
 * exactly ONE image in that project's `images` array.
 */
export const PROJECTS: Project[] = [
  {
    n: '01',
    title: 'Archipedia',
    by: 'clay+daniel',
    discipline: 'Software',
    year: '2026',
    description:
      'Architectural precedent search rebuilt as a node canvas you compose and steer, not a single best-match ranking. Wire image, text, and attribute nodes into a query, then dial the fusion weights live to widen the search without narrowing your taste. Written up and submitted to ACM DIS 2026.',
    learned:
      'Keep the designer in the loop and the machine widens the search without narrowing the taste.',
    collaborators: 'Armaan Kokan, Patrick Danahy',
    images: [
      {
        src: `${A}/04-search-by-assembly/search-by-assembly-node-based-workflow-canvas.webp`,
        ratio: 1.8305,
        alt: 'The node-based query canvas, image, text, and attribute nodes wired into a graph, ranked results listed alongside',
        caption: 'A query, composed on the canvas',
        // Hero fills the top region; the canvas has padding so a hair of crop is clean (full view in the lightbox).
        fit: 'cover',
      },
      {
        src: `${A}/04-search-by-assembly/search-by-assembly-system-pipeline.webp`,
        ratio: 1.5456,
        alt: 'The system pipeline: images and attributes encoded into features, fused by weight, then ranked into results',
        caption: 'The pipeline, encode to fuse to rank',
        fit: 'contain',
      },
      {
        src: `${A}/04-search-by-assembly/search-by-assembly-tri-slider-fusion-weights-control.webp`,
        ratio: 2.1522,
        alt: 'The tri-slider control setting fusion weights across visual, spatial, and regional evidence',
        caption: 'The tri-slider, dialing what matters, live',
        fit: 'contain',
      },
      {
        src: `${A}/04-search-by-assembly/search-by-assembly-search-bar-ranked-precedent-results.webp`,
        ratio: 0.4591,
        alt: 'Ranked precedent results, each traceable to the motifs that matched',
        caption: 'Ranked precedents, each one legible',
        fit: 'contain',
      },
    ],
    paper: {
      venue: 'ACM DIS 2026 · submitted',
      authors: 'Clay Seifert, Daniel Guerra, Armaan Kokan, Patrick Danahy',
      pdf: '',
      pdfSize: '',
    },
  },
  {
    // MERGED (2026-07-13): the former "KUKA Robotics" and "Texas Robotics" entries are one project,
    // framed as robots-as-instruments. Comment 6 (2026-07-15): the two MAIN points are the KUKA robot
    // VIDEO (real, sped-up 9.5s loop) and Clay's real Texas Robotics device video; the KUKA stills are
    // ducked below. Attribution is SHARED: Clay owns the Texas Robotics half, Daniel owns the KUKA half,
    // so `by: 'clay+daniel'`.
    n: '02',
    title: 'Robots as Instruments',
    by: 'clay+daniel',
    // TODO(Daniel): confirm discipline (robots-as-instruments = physical tooling/making → Product Design)
    discipline: 'Product Design',
    year: '2026',
    description:
      'Two ways of treating an industrial robot as an instrument, not a laborer. On a KUKA arm, one script that sands metal, carves sand, plots ink, and draws with light; at Texas Robotics, a device built to actually move and tested as a working mechanism. Together, the machine becomes an expressive partner, not automated labor.',
    learned:
      'Given a well made tool and a thoughtful toolpath, a robot becomes an expressive partner rather than automated labor. And building a machine that truly moves, then watching where it fails, teaches more than drawing one ever does.',
    // TODO(Daniel): collaborators/professors (Living with Robots Lab / Texas Robotics faculty?)
    images: [
      {
        src: `${A}/06-kuka-robotics/kuka-robotics-robot-loop-poster.webp`,
        ratio: 1.7778,
        alt: 'A KUKA robot arm sanding an aluminium sheet, tooling an ornamented surface',
        caption: 'The KUKA arm, in motion',
        hero: true,
        video: {
          mp4: `${A}/06-kuka-robotics/kuka-robotics-robot-loop.mp4`,
          webm: `${A}/06-kuka-robotics/kuka-robotics-robot-loop.webm`,
          // Already sped up at export; play at source rate.
          rate: 1,
        },
      },
      {
        src: `${A}/13-texas-robotics/texas-robotics-robot-device-loop-poster.webp`,
        ratio: 1.7937,
        alt: 'A Texas Robotics device in motion, built as a working moving mechanism',
        caption: 'The Texas Robotics device, in motion',
        video: {
          mp4: `${A}/13-texas-robotics/texas-robotics-robot-device-loop.mp4`,
          webm: `${A}/13-texas-robotics/texas-robotics-robot-device-loop.webm`,
          rate: 0.85,
        },
      },
      {
        src: `${A}/06-kuka-robotics/kuka-robotics-led-light-drawing-long-exposure.webp`,
        ratio: 1.3333,
        alt: 'Long-exposure photograph of the KUKA arm tracing a radial burst of LED light',
        caption: 'Drawing with light, the motion made visible',
      },
    ],
  },
  {
    // Comment 6 (2026-07-15): re-attributed to Clay.
    n: '03',
    title: 'Robotic Factory',
    by: 'clay',
    // TODO(Daniel): confirm discipline ("a factory drawn as architecture" → Architecture)
    discipline: 'Architecture',
    year: '2025',
    description:
      'A factory drawn as architecture rather than as a shed: a long vaulted hall where ranks of robot arms run on rails beneath planted arches, the landscape folded over the roof and down into the bays. The section is the argument, machines and planting sharing one structure so the factory becomes a building people would want to be inside.',
    learned:
      'Put the growing and the making under the same vault and the factory stops being infrastructure to hide, it becomes a building people would want to be inside.',
    // TODO(Daniel): collaborators/professors
    images: [
      {
        src: `${A}/10-robotic-factory/robotic-factory-section-assembly-poster.webp`,
        ratio: 1.9375,
        alt: 'Animated long section of the robotic factory assembling itself, the vaulted halls, chimneys and planted terraces building up in sequence',
        caption: 'The section, assembling itself',
        video: {
          mp4: `${A}/10-robotic-factory/robotic-factory-section-assembly-loop.mp4`,
          webm: `${A}/10-robotic-factory/robotic-factory-section-assembly-loop.webm`,
          rate: 0.85,
        },
      },
      {
        src: `${A}/10-robotic-factory/robotic-factory-planted-vaults-interior.webp`,
        ratio: 1.6591,
        alt: 'Interior of the factory, bronze vaulted arches framing a wall of ferns and flowering planting, robot arms on rails to the right',
        caption: 'Planting and machines under one vault',
      },
      {
        src: `${A}/10-robotic-factory/robotic-factory-interior-hall-robot-arms.webp`,
        ratio: 1.7405,
        alt: 'White clay-render cutaway of the production hall, ranks of robot arms mounted on linear rails beneath the vaulted bays',
        caption: 'The hall, robot arms ranked along the rails',
        fit: 'contain',
      },
      {
        src: `${A}/10-robotic-factory/robotic-factory-long-section-clipped.webp`,
        ratio: 1.913,
        alt: 'Clipped long section of the whole factory in white, the vaulted production halls, stacks and process equipment read end to end',
        caption: 'The long section, end to end',
        fit: 'contain',
      },
    ],
  },
  {
    n: '04',
    title: 'Synthetic Vision',
    by: 'clay',
    discipline: 'Software',
    year: '2025',
    description:
      'A Vision Transformer is trained on a synthetic taxonomy of the operations that generate architectural form, extrusion, revolution, Boolean subtraction, then used to read those same operations back out of eroded photogrammetric fragments. It recovers how a form was built, not just what it is called. Published at AAG 2025 (MIT).',
    learned:
      'The same premise, that a form’s geometry maps to how it is fabricated, is what lets Bower’s engine price a shape before it is ever cut.',
    collaborators: 'Patrick Danahy',
    paper: {
      venue: 'AAG 2025 · MIT',
      authors: 'Clay Seifert, Patrick Danahy',
      pdf: `${A}/08-synthetic-vision/aag-2025-synthetic-vision-seifert-danahy.pdf`,
      pdfSize: 'PDF · 3.7 MB',
    },
    images: [
      {
        src: `${A}/08-synthetic-vision/synthetic-vision-patch-probe-saliency-heatmaps.webp`,
        ratio: 1.2344,
        alt: 'Grid of saliency heatmaps over architectural fragments, warm colors marking where each geometric primitive is detected',
        caption: 'Patch-probe saliency, where each fragment reads as a known primitive',
        // Hero fills the top region; this is a render grid, croppable a hair (full grid in the lightbox).
        fit: 'cover',
      },
      {
        src: `${A}/08-synthetic-vision/synthetic-vision-56-class-geometry-taxonomy.webp`,
        ratio: 0.7014,
        alt: 'Grid of 56 line-drawn geometry classes, vaults, domes, cones, prisms, pyramids, and arches, each labelled',
        caption: 'The 56-class taxonomy of generative operations the model learns',
        fit: 'contain',
      },
      {
        src: `${A}/08-synthetic-vision/synthetic-vision-two-stage-vit-pipeline.webp`,
        ratio: 3.7767,
        alt: 'Diagram of the two-stage pipeline: a synthetic pretraining stage feeding a Vision Transformer with two task heads',
        caption: 'The two-stage pipeline, synthetic pretraining then fragment analysis',
        fit: 'contain',
      },
      {
        src: `${A}/08-synthetic-vision/synthetic-vision-umap-latent-geometry.webp`,
        ratio: 2.9021,
        alt: 'UMAP scatter plot of fragment descriptors colored by source building, clustering by shared geometry',
        caption: 'Fragments embedded by shared geometry, colored by building',
        fit: 'contain',
      },
    ],
  },
  {
    n: '05',
    title: 'Patterns Across Languages',
    by: 'clay',
    discipline: 'Software',
    year: '2025',
    description:
      'The method scales across cultures: 158 fragments from Gothic, Romanesque, and Islamic monuments of the 11th to 14th centuries, mapped by their latent projective geometry rather than their style labels. It quantifies where distant traditions share a constructive grammar and where they diverge. Published at ACADIA 2025.',
    learned:
      'Turn an archive into evidence you can measure, not a catalogue you can only browse, and scale stops meaning sameness.',
    // TODO(Daniel): collaborators/professors (paper is sole-authored — likely none)
    paper: {
      venue: 'ACADIA 2025 · Computing for Resilience',
      authors: 'Clay Seifert',
      pdf: `${A}/09-patterns-across-languages/acadia-2025-patterns-across-languages-seifert.pdf`,
      pdfSize: 'PDF · 12.9 MB',
    },
    images: [
      {
        src: `${A}/09-patterns-across-languages/patterns-medieval-fragments-ten-monuments.webp`,
        ratio: 2.0941,
        alt: 'Grid of photogrammetric fragment renders from ten medieval monuments across Islamic, Romanesque, and Gothic traditions',
        caption: 'Fragments from ten medieval monuments across three traditions',
        // Hero fills the top region; photogrammetric renders crop a hair cleanly (full grid in the lightbox).
        fit: 'cover',
      },
      {
        src: `${A}/09-patterns-across-languages/patterns-multiscale-saliency-fragment.webp`,
        ratio: 2.5721,
        alt: 'Multi-scale saliency rows over one fragment, showing which geometric primitives the model reads at each image scale',
        caption: 'Multi-scale saliency, the same fragment read at four resolutions',
        fit: 'contain',
      },
      {
        src: `${A}/09-patterns-across-languages/patterns-umap-latent-geometry-clusters.webp`,
        ratio: 1.6306,
        alt: 'UMAP scatter plot embedding the 158 fragments into a latent geometry space, colored by cluster',
        caption: 'The fragments embedded by shared geometry, not by style',
        fit: 'contain',
      },
      {
        src: `${A}/09-patterns-across-languages/patterns-style-foldchange-heatmaps.webp`,
        ratio: 1.7918,
        alt: 'Three log fold-change heatmaps comparing which geometric motifs are enriched between Gothic, Romanesque, and Islamic fragments',
        caption: 'Where the traditions diverge, motif by motif and scale by scale',
        fit: 'contain',
      },
    ],
  },
  {
    // NEW (2026-07-13). Framing from Clay: an experiment, not a finished product. Lineage is MIT
    // Design Intelligence Lab's Large Language Objects (physical bodies for language models). The lamp
    // runs "Dream Machine", a tool to DJ a drawing. Comment 6 (2026-07-15): re-attributed to Clay.
    // TODO(Daniel): confirm the year, and whether "Dream Machine" is the final name.
    n: '06',
    title: 'LLO: Dream Machine',
    by: 'clay',
    discipline: 'Product Design',
    year: '2024',
    description:
      'An experiment, not a product: a desk lamp built to give a language model a body, after MIT’s Large Language Objects. It runs Dream Machine, a tool to DJ a drawing, you sketch, then project imagery back over the sketch to expand the idea. The armature is plywood, pulleys, and string, left deliberately unfinished.',
    learned:
      'It stays deliberately unfinished. The question was whether a model feels different once it has a posture and sits on the desk with you, not whether it ships.',
    // TODO(Daniel): collaborators/professors (MIT Design Intelligence Lab lineage — any named?)
    images: [
      {
        src: `${A}/14-large-language-object/large-language-object-lamp.webp`,
        ratio: 1.3389,
        alt: 'The Large Language Object, a plywood articulated desk lamp on a wooden base with pulleys, red string, and a separate control box',
        caption: 'The Large Language Object, a lamp that gives a model a body',
      },
      {
        src: `${A}/14-large-language-object/large-language-object-draft-1.webp`,
        ratio: 0.7498,
        alt: 'A working draft of the Large Language Object lamp',
        caption: 'A working draft',
      },
      {
        src: `${A}/14-large-language-object/large-language-object-draft-2.webp`,
        ratio: 0.7498,
        alt: 'A second working draft of the Large Language Object lamp',
        caption: 'A second working draft',
      },
    ],
  },
  {
    // NEW (2026-07-13). Resia is Clay's startup. TODO(Daniel): confirm the year and current status.
    n: '07',
    title: 'Resia',
    by: 'clay',
    discipline: 'Software',
    year: '2024',
    description:
      'An AI remodeling platform that carries a homeowner from idea to finished job in one place: generate the design, estimate the cost, write the contract, and manage the build. It folds a chain of handoffs, where most of the renovation pain lives, into a single tool. Grown to ten people through two accelerators.',
    learned:
      'A renovation is a chain of handoffs, and most of the pain is in the seams; putting the whole chain in one tool is where the leverage is.',
    // TODO(Daniel): collaborators/professors
    images: [
      {
        src: `${A}/12-resia/resia-product-screenshot-1.webp`,
        ratio: 1.8397,
        alt: 'The Resia landing page, a one-stop remodeling solution to generate, estimate, contract, and manage a renovation',
        caption: 'One stop, from generate to manage',
      },
      {
        src: `${A}/12-resia/resia-brand-artboard.webp`,
        ratio: 1.0,
        alt: 'A Resia brand artboard, a kitchen shown before and after a renovation with the line "Kitchen Renovation Made Simple"',
        caption: 'Before and after, the renovation made simple',
      },
      {
        src: `${A}/12-resia/resia-product-screenshot-2.webp`,
        ratio: 2.0438,
        alt: 'A second Resia product screenshot',
        caption: 'Inside the product',
      },
      {
        src: `${A}/12-resia/resia-logo.webp`,
        ratio: 1.0778,
        alt: 'The Resia logo',
        caption: 'The mark',
        fit: 'contain',
      },
    ],
  },
  {
    n: '08',
    title: 'Dougherty Arts Center',
    by: 'clay+daniel',
    discipline: 'Architecture',
    year: '2024',
    description:
      'An arts center rebuilt from its own salvaged structure, with 3D-printed catenary arches turning a floodplain site into shaded public space. The building touches the ground lightly and gives the park back as public room rather than fencing it off.',
    learned:
      'On a floodplain the honest move is to touch the ground lightly and give public space back.',
    // TODO(Daniel): collaborators/professors
    images: [
      {
        src: `${A}/05-dougherty/dougherty-arts-center-wall-section-south-facing-east-wing-HERO.webp`,
        ratio: 1.1998,
        alt: 'Wall section through the south-facing east wing, the catenary arch and timber roof drawn as one detailed assembly',
        caption: 'Wall section, the whole assembly in one drawing',
        fit: 'contain',
      },
      {
        src: `${A}/05-dougherty/dougherty-arts-center-physical-model-cardboard-catenary.webp`,
        ratio: 1.4997,
        alt: 'Cardboard physical model of the arts center, its white catenary arches standing in the round',
        caption: 'The model, proportion in the round',
      },
      {
        src: `${A}/05-dougherty/dougherty-arts-center-catenary-entrance-skyline-money-shot.webp`,
        ratio: 1.7778,
        alt: 'The catenary arch entrances framing a runner with the downtown Austin skyline behind',
        caption: 'The catenary entrances open the building to the park',
        // HERO: a render that fills the top region. The wall-section drawing (must not crop) stays a
        // supporting cell, where the justified row matches its cell to its aspect so it fills there.
        hero: true,
      },
      {
        src: `${A}/05-dougherty/dougherty-arts-center-ground-floor-plan.webp`,
        ratio: 1.5504,
        alt: 'Ground floor plan of the arts center, studios and public rooms threaded between the arch lines',
        caption: 'Ground floor plan',
        fit: 'contain',
      },
    ],
  },
  {
    // NEW (2026-07-15, Comment 7). Daniel's water project, pulled from his portfolio. Fall 2024, so it
    // sits in the 2024 band. The description is lightly tightened from Daniel's copy: the third sentence
    // (the nomination + competition) is dropped here because it lives in `awards` below — kept it once.
    // TODO(Daniel): confirm the "learned" pill wording.
    n: '09',
    title: 'Hydraulic Commons: Water Infrastructure',
    by: 'daniel',
    discipline: 'Architecture',
    year: '2024',
    description:
      "A water-driven architecture on Austin's Colorado River that turns water treatment and food production into public space, not hidden utility. The building rises from the riverbank as a circular resource loop, treatment, aquaponics, and vertical farming each feeding the next, processing 500 gallons an hour, sized to real community need.",
    learned: 'Infrastructure people are invited into gets cared for; the same flows behind a fence never do.',
    awards: ['Fall 2024 Design Excellence Nominee', 'Lisbon Triennale Millennium Competition (entrant)'],
    collaborators: 'Professor Rasa Navasaityte',
    images: [
      {
        src: `${A}/17-hydraulic-commons/hydraulic-commons-landform-rendering-river-infrastructure.webp`,
        ratio: 1.7778,
        alt: 'The building rising from the Colorado River bank as landform infrastructure',
        caption: 'Landform infrastructure rising from the river',
        hero: true,
      },
      {
        src: `${A}/17-hydraulic-commons/hydraulic-commons-circular-program-axonometric-diagram.webp`,
        ratio: 1.0,
        alt: 'Axonometric diagram of the circular water and food resource program',
        caption: 'The circular resource loop, program as diagram',
        fit: 'contain',
      },
      {
        src: `${A}/17-hydraulic-commons/hydraulic-commons-generation-aerial-terraced-landscape.webp`,
        ratio: 1.0,
        alt: 'Aerial view of the terraced riverbank water landscape',
        caption: 'The terraced water landscape from above',
      },
      {
        src: `${A}/17-hydraulic-commons/hydraulic-commons-community-pool-ground-perspective-austin.webp`,
        ratio: 1.7778,
        alt: 'Ground-level view of the public pool and community water spaces',
        caption: 'The public pool and community water spaces',
      },
    ],
  },
  {
    n: '10',
    title: 'Plentify',
    by: 'clay+daniel',
    // TODO(Daniel): confirm discipline (a grown building + composite material research → Architecture)
    discipline: 'Architecture',
    year: '2023',
    description:
      'A building that grows its own structure, its walls farmed on site as bamboo and hemp, then cast into Plentify, a composite prototyped and tested 30% stronger than hempcrete. It shows architecture can be grown in place and paced to the people who build it, not only trucked in and assembled.',
    learned:
      'Architecture can be grown in place and paced to the people who build it, not only trucked in and assembled.',
    // TODO(Daniel): collaborators/professors
    images: [
      {
        src: `${A}/01-synergy/synergy-cosmos-growth-loop-poster.webp`,
        ratio: 1.7778,
        alt: 'Looping animation of the building growing from bare structure to fully planted, bamboo and hemp filling in the planter cells',
        caption: 'Grown in, frame by frame',
        video: {
          mp4: `${A}/01-synergy/synergy-cosmos-growth-loop.mp4`,
          webm: `${A}/01-synergy/synergy-cosmos-growth-loop.webm`,
          // Slower than the source render: the growth should read as growth, not as playback.
          rate: 0.72,
        },
      },
      {
        src: `${A}/01-synergy/synergy-cosmos-courtyard-render.webp`,
        ratio: 1.3214,
        alt: 'Aerial view down into a planted courtyard, terraced buildings and stairways planted with the crops that become the walls',
        caption: 'The courtyard, planted with the crops that become the walls',
      },
      {
        src: `${A}/01-synergy/synergy-cosmos-construction-closeup.webp`,
        ratio: 1.0,
        alt: 'Close view of a Plentify wall under construction, bamboo reinforcement tied into the wet composite beside a window opening',
        caption: 'On site, bamboo tied into the wall as it goes up',
      },
      {
        src: `${A}/01-synergy/synergy-cosmos-compression-test.webp`,
        ratio: 1.001,
        alt: 'A Plentify sample under compression on the MTS Insight testing machine',
        caption: 'Testing the mix under compression, +30% over hempcrete',
      },
    ],
  },
  {
    // Year 2023 confirmed by Daniel (2026-07-13); the timeline places this moment at 2023 too.
    n: '11',
    title: 'Origami Medical Device',
    by: 'daniel',
    discipline: 'Product Design',
    year: '2023',
    description:
      'A $0.25 origami-inspired device to prevent pressure wounds, prototyped for Moi Teaching Hospital in Kenya with AMPATH. Daniel directed a fourteen-student team, and the design was transferred for clinical deployment.',
    learned:
      'A constraint this hard, a device that has to cost cents and fold flat, is a design tool: it forces the idea down to the one move that matters.',
    // TODO(Daniel): collaborators/professors (AMPATH partner + the fourteen-student team — unnamed)
    images: [
      {
        src: `${A}/11-wound-care-kenya/wound-care-kenya-staged-cardboard-wedge-prototype.webp`,
        ratio: 1.2795,
        alt: 'The origami-inspired cardboard wedge prototype, a low-cost wound-prevention device, staged for photography',
        caption: 'The folded cardboard wedge, prototyped to cost cents',
      },
      {
        src: `${A}/11-wound-care-kenya/wound-care-kenya-in-hospital-device-test.webp`,
        ratio: 1.2125,
        alt: 'The device tested in hospital at Moi Teaching Hospital, Kenya',
        caption: 'Tested in hospital at Moi Teaching Hospital, Kenya',
      },
    ],
  },
  {
    n: '12',
    title: 'Flowerfield',
    by: 'clay',
    // TODO(Daniel): confirm discipline — Flowerfield is an ecodistrict, reads as Architecture; placed in
    // Product Design per the coordinator's explicit assignment.
    discipline: 'Product Design',
    year: '2022',
    description:
      "Austin's first ecodistrict: a high-density, low-rise housing community grown like nature, curving and alive. It reaches net-zero energy and carbon, filters all of its water on site down to the city's blackwater, and lifts the block from 155 to 630 homes, with room for 2,000 more.",
    learned:
      'A building can carry the full complexity of a living system, its water, growth, and habitat, and house more people rather than fewer. This is the closest ancestor to Eden.',
    // TODO(Daniel): collaborators/professors
    images: [
      {
        src: `${A}/07-flowerfield/flowerfield-biophilic-ecodistrict-hero-render.webp`,
        ratio: 1.9093,
        alt: 'Aerial-level render of the flowerfield ecodistrict, organic white buildings above a field of flowers and filtration ponds with the Austin skyline behind',
        caption: 'flowerfield, an ecodistrict grown like nature',
      },
      {
        src: `${A}/07-flowerfield/flowerfield-vaulted-pavilion-boardwalk-water.webp`,
        ratio: 1.9256,
        alt: 'People on a boardwalk crossing filtered water beneath the branching vaults of a flowerfield pavilion',
        caption: 'Under the vaults, boardwalks cross the filtered water',
      },
      {
        src: `${A}/07-flowerfield/flowerfield-exploded-systems-axonometric.webp`,
        ratio: 1.2157,
        alt: 'Exploded axonometric annotating the systems: wind scoops, solar panels, green roofs, geothermal floor heating, and 3D-printed hempcrete',
        caption: 'How it works, from wind scoops to 3D-printed hempcrete',
        fit: 'contain',
      },
      {
        src: `${A}/07-flowerfield/flowerfield-watercolor-site-plan.webp`,
        ratio: 0.9619,
        alt: 'Watercolor site plan of flowerfield, buildings and lagoons drawn as organic petal-shaped plots',
        caption: 'The site plan, drawn as petals and lagoons',
        fit: 'contain',
      },
    ],
  },
];
