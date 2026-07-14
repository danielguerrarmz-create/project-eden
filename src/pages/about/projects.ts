/**
 * projects.ts — the project set for the About / projects page.
 *
 * These are REAL projects imported from Daniel's portfolio (Archipedia, Plentify,
 * Dougherty Arts Center, Kuka Robotics), each with curated images copied into
 * /public/assets/projects. There are NO individual project pages; the whole story lives
 * in the master-detail LIST on the About page: a curated set of images (hero first), a
 * short description, and the "What we learned" takeaway.
 *
 * DISPLAY ORDER (2026-07-12) is REVERSE CHRONOLOGICAL — most recent work first — and the
 * `n` index encodes it, so the number the reader sees IS the position. The array below is
 * still in authoring order; the page sorts by `n`. Clay has projects to add later, and
 * Daniel has more of his own to add later.
 * `by`: 'clay+daniel' | 'daniel' | 'clay'.
 */
export type Author = 'clay+daniel' | 'daniel' | 'clay';

/** A moving hero. `src` is the POSTER still (also what the thumbnail and the lightbox's
 *  layout morph use), and the sources play in place of it. `rate` is the playback rate:
 *  under 1 the loop reads slower and calmer than the source render. */
export interface ProjectVideo {
  mp4: string;
  webm?: string;
  rate?: number;
}

export interface ProjectImage {
  /** Public path under /assets/projects/... For a video this is the poster still. */
  src: string;
  /** Accessible description (required — every image carries alt text). */
  alt: string;
  /** Optional short caption shown under the image. */
  caption?: string;
  /** How the image fills its tile. Renders (default) crop with 'cover'; paper figures
   *  and diagrams use 'contain' so nothing is cut off. */
  fit?: 'cover' | 'contain';
  /** Present when this "image" is really a looping video. */
  video?: ProjectVideo;
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
  /** Awards or recognitions, one per line. Rendered in the detail panel's "Awards and publications"
   *  stage alongside any `paper`. None are populated yet; the field exists so adding one is a
   *  one-line change and the hierarchy has a home for it. */
  awards?: string[];
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

/** The two people behind Bower, for the short "who we are" area on the About page.
 *
 * Each bio is TWO sentences: one true, quirky detail drawn only from facts already in this repo,
 * then the role sentence. Nothing here is invented — the medical device and its numbers come from
 * the Origami project (n:10), the two papers from Synthetic Vision / Patterns (n:04, n:05).
 *
 * TODO(Daniel): Sai drafted fuller candidate bios that lean on facts NOT yet in this repo, held
 * here so they aren't presented as fact until you confirm them:
 *   Clay — "Before that: years at Rick Wright Architects in Dallas, and a stretch at TestFit,
 *     drawing and building software for buildings. He also cofounded Resia, an AI remodeling
 *     platform." (confirm the Rick Wright / TestFit years and the right verb for his Resia role.)
 *   Daniel — "taught a KUKA arm to draw with light, and gave a language model a body it can sit on
 *     a desk with, a lamp that runs Dream Machine. A stint at Rogers Partners in New York, then he
 *     decided architecture needed an engine, not another renderer." (confirm the Rogers Partners
 *     dates/role and whether "Dream Machine" is the name to print.) */
export const TEAM: TeamMember[] = [
  {
    name: 'Clay Seifert',
    role: 'Cofounder · design & research',
    bio: 'Clay spent two years teaching a computer to tell one vault from another, work that became two published papers (AAG 2025, ACADIA 2025). Architect and researcher at UT Austin, he leads Bower’s design and the living-architecture research it grew from.',
    image: null, // portrait forthcoming
  },
  {
    name: 'Daniel Guerra',
    role: 'Cofounder · engine & systems',
    bio: 'Daniel once directed a fourteen-student team to build a $0.25 origami medical device for a teaching hospital in Kenya. Architect, product designer, and engineer, he builds Bower’s generative engine and the systems around it.',
    image: '/assets/about/daniel-headshot.jpg',
  },
];

const A = '/assets/projects';

/** The imported set, HERO (Archipedia) first, then the rest. */
export const PROJECTS: Project[] = [
  {
    n: '01',
    title: 'Archipedia',
    by: 'clay+daniel',
    year: '2026',
    description:
      'Architectural precedent search rebuilt as something you compose and steer on a node canvas, not a single best-match ranking. Submitted to ACM DIS 2026.',
    learned:
      'Keep the designer in the loop and the machine widens the search without narrowing the taste.',
    images: [
      {
        src: `${A}/04-search-by-assembly/search-by-assembly-node-based-workflow-canvas.webp`,
        alt: 'The node-based query canvas, image, text, and attribute nodes wired into a graph, ranked results listed alongside',
        caption: 'A query, composed on the canvas',
        fit: 'contain',
      },
      {
        src: `${A}/04-search-by-assembly/search-by-assembly-nodes-and-relays-visual-graph.webp`,
        alt: 'The palette of composable node types: text, image, attributes, constraints, and logic operators',
        caption: 'The vocabulary, nodes you wire into a query',
        fit: 'contain',
      },
      {
        src: `${A}/04-search-by-assembly/search-by-assembly-tri-slider-fusion-weights-control.webp`,
        alt: 'The tri-slider control setting fusion weights across visual, spatial, and regional evidence',
        caption: 'The tri-slider, dialing what matters, live',
        fit: 'contain',
      },
      {
        src: `${A}/04-search-by-assembly/search-by-assembly-search-bar-ranked-precedent-results.webp`,
        alt: 'Ranked precedent results, each traceable to the motifs that matched',
        caption: 'Ranked precedents, each one legible',
        fit: 'contain',
      },
      {
        src: `${A}/04-search-by-assembly/search-by-assembly-system-pipeline.webp`,
        alt: 'The system pipeline: images and attributes encoded into features, fused by weight, then ranked into results',
        caption: 'The pipeline, encode to fuse to rank',
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
    n: '04',
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
    n: '05',
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
    n: '11',
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
        fit: 'contain',
      },
      {
        src: `${A}/07-flowerfield/flowerfield-exploded-systems-axonometric.webp`,
        alt: 'Exploded axonometric annotating the systems: wind scoops, solar panels, green roofs, geothermal floor heating, and 3D-printed hempcrete',
        caption: 'How it works, from wind scoops to 3D-printed hempcrete',
        fit: 'contain',
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
        fit: 'contain',
      },
    ],
  },
  {
    n: '09',
    title: 'Plentify',
    by: 'clay+daniel',
    year: '2023',
    description:
      'A building that grows its own structure, its walls farmed on site as bamboo and hemp, then cast into Plentify, a composite prototyped and tested +30% stronger than hempcrete.',
    learned:
      'Architecture can be grown in place and paced to the people who build it, not only trucked in and assembled.',
    images: [
      {
        src: `${A}/01-synergy/synergy-cosmos-growth-loop-poster.webp`,
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
        alt: 'Aerial view down into a planted courtyard, terraced buildings and stairways planted with the crops that become the walls',
        caption: 'The courtyard, planted with the crops that become the walls',
        fit: 'contain',
      },
      {
        src: `${A}/01-synergy/synergy-cosmos-construction-closeup.webp`,
        alt: 'Close view of a Plentify wall under construction, bamboo reinforcement tied into the wet composite beside a window opening',
        caption: 'On site, bamboo tied into the wall as it goes up',
        fit: 'contain',
      },
      {
        src: `${A}/01-synergy/synergy-cosmos-compression-test.webp`,
        alt: 'A Plentify sample under compression on the MTS Insight testing machine',
        caption: 'Testing the mix under compression, +30% over hempcrete',
        fit: 'contain',
      },
    ],
  },
  {
    n: '08',
    title: 'Dougherty Arts Center',
    by: 'clay+daniel',
    year: '2024',
    description:
      'An arts center rebuilt from its own salvaged structure, 3D-printed catenary arches turning a floodplain site into shaded public space.',
    learned:
      'On a floodplain the honest move is to touch the ground lightly and give public space back.',
    images: [
      {
        src: `${A}/05-dougherty/dougherty-arts-center-wall-section-south-facing-east-wing-HERO.webp`,
        alt: 'Wall section through the south-facing east wing, the catenary arch and timber roof drawn as one detailed assembly',
        caption: 'Wall section, the whole assembly in one drawing',
        fit: 'contain',
      },
      {
        src: `${A}/05-dougherty/dougherty-arts-center-physical-model-cardboard-catenary.webp`,
        alt: 'Cardboard physical model of the arts center, its white catenary arches standing in the round',
        caption: 'The model, proportion in the round',
      },
      {
        src: `${A}/05-dougherty/dougherty-arts-center-catenary-entrance-skyline-money-shot.webp`,
        alt: 'The catenary arch entrances framing a runner with the downtown Austin skyline behind',
        caption: 'The catenary entrances open the building to the park',
      },
      {
        src: `${A}/05-dougherty/dougherty-arts-center-north-facade-perspective-austin-skyline.webp`,
        alt: 'The resolved north facade seen across the park with the Austin skyline behind',
      },
      {
        src: `${A}/05-dougherty/dougherty-arts-center-structural-axonometric-timber-roof.webp`,
        alt: 'Axonometric of the catenary arch and timber roof structure read as one family',
        fit: 'contain',
      },
      {
        src: `${A}/05-dougherty/dougherty-arts-center-final-site-plan.webp`,
        alt: 'Final site plan of the Dougherty Arts Center, the building and its landscape set into the floodplain park',
        caption: 'Site plan',
        fit: 'contain',
      },
      {
        src: `${A}/05-dougherty/dougherty-arts-center-ground-floor-plan.webp`,
        alt: 'Ground floor plan of the arts center, studios and public rooms threaded between the arch lines',
        caption: 'Ground floor plan',
        fit: 'contain',
      },
    ],
  },
  {
    // PLACEHOLDER (2026-07-13). The images and the video are real; the description, the
    // takeaway, the author and the year are inferred from what the renders show and are
    // waiting on Daniel's real project notes. Do not treat this copy as final.
    n: '03',
    title: 'Robotic Factory',
    by: 'daniel',
    year: '2025',
    description:
      'A factory drawn as architecture rather than as a shed: a long vaulted hall where ranks of robot arms run on rails beneath planted arches, and the landscape is folded over the roof and down into the bays instead of being fenced out. The section is the argument, the machines and the planting share one structure.',
    learned:
      'Put the growing and the making under the same vault and the factory stops being infrastructure to hide, it becomes a building people would want to be inside.',
    images: [
      {
        src: `${A}/10-robotic-factory/robotic-factory-section-assembly-poster.webp`,
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
        alt: 'Interior of the factory, bronze vaulted arches framing a wall of ferns and flowering planting, robot arms on rails to the right',
        caption: 'Planting and machines under one vault',
      },
      {
        src: `${A}/10-robotic-factory/robotic-factory-interior-hall-robot-arms.webp`,
        alt: 'White clay-render cutaway of the production hall, ranks of robot arms mounted on linear rails beneath the vaulted bays',
        caption: 'The hall, robot arms ranked along the rails',
        fit: 'contain',
      },
      {
        src: `${A}/10-robotic-factory/robotic-factory-long-section-clipped.webp`,
        alt: 'Clipped long section of the whole factory in white, the vaulted production halls, stacks and process equipment read end to end',
        caption: 'The long section, end to end',
        fit: 'contain',
      },
    ],
  },
  {
    // Year 2023 confirmed by Daniel (2026-07-13); the timeline places this moment at 2023 too.
    n: '10',
    title: 'Origami Medical Device',
    by: 'daniel',
    year: '2023',
    description:
      'A $0.25 origami-inspired device to prevent pressure wounds, prototyped for Moi Teaching Hospital in Kenya with AMPATH. Daniel directed a fourteen-student team, and the design was transferred for clinical deployment.',
    learned:
      'A constraint this hard, a device that has to cost cents and fold flat, is a design tool: it forces the idea down to the one move that matters.',
    images: [
      {
        src: `${A}/11-wound-care-kenya/wound-care-kenya-staged-cardboard-wedge-prototype.webp`,
        alt: 'The origami-inspired cardboard wedge prototype, a low-cost wound-prevention device, staged for photography',
        caption: 'The folded cardboard wedge, prototyped to cost cents',
      },
      {
        src: `${A}/11-wound-care-kenya/wound-care-kenya-in-hospital-device-test.webp`,
        alt: 'The device tested in hospital at Moi Teaching Hospital, Kenya',
        caption: 'Tested in hospital at Moi Teaching Hospital, Kenya',
      },
    ],
  },
  {
    // MERGED (2026-07-13): the former "KUKA Robotics" and "Texas Robotics" entries are now one
    // project, framed as robots-as-instruments. KUKA supplies the stills (drawing with light, ink,
    // and abrasion, plus the new real sanding photo and the toolpath simulation); Texas Robotics
    // supplies the built, moving device (video + still). Year takes the most recent (KUKA, 2026) so
    // the merged project keeps its reverse-chronological slot. TODO(Daniel): confirm the Texas
    // Robotics year and whether it was a lab, a course, or a personal build.
    n: '02',
    title: 'Robots as Instruments',
    by: 'daniel',
    year: '2026',
    description:
      'Two ways of treating an industrial robot as an instrument rather than a laborer. On a KUKA arm, one script that sands metal, carves sand, plots ink, and draws with light. At Texas Robotics, a device built to actually move and tested as a working mechanism, not a static model.',
    learned:
      'Given a well made tool and a thoughtful toolpath, a robot becomes an expressive partner rather than automated labor. And building a machine that truly moves, then watching where it fails, teaches more than drawing one ever does.',
    images: [
      {
        src: `${A}/06-kuka-robotics/kuka-robotics-led-light-drawing-long-exposure.webp`,
        alt: 'Long-exposure photograph of the KUKA arm tracing a radial burst of LED light',
        caption: 'Drawing with light, the motion made visible',
      },
      {
        src: `${A}/06-kuka-robotics/kuka-robotics-arm-sanding-aluminum-sheet-platen.webp`,
        alt: 'The KUKA arm sanding a clamped aluminium sheet with a flat platen end effector',
        caption: 'Sanding metal with a platen end effector',
      },
      {
        src: `${A}/13-texas-robotics/texas-robotics-robot-device-loop-poster.webp`,
        alt: 'A Texas Robotics device in motion, built as a working moving mechanism',
        caption: 'The Texas Robotics device, in motion',
        video: {
          mp4: `${A}/13-texas-robotics/texas-robotics-robot-device-loop.mp4`,
          webm: `${A}/13-texas-robotics/texas-robotics-robot-device-loop.webm`,
          rate: 0.85,
        },
      },
      {
        src: `${A}/06-kuka-robotics/kuka-robotics-toolpath-simulation-rosette.webp`,
        alt: 'A simulation screenshot of the KUKA arm, its toolpath drawn as a red rosette of passes around the tool',
        caption: 'The toolpath simulated before it cuts',
        fit: 'contain',
      },
      {
        src: `${A}/06-kuka-robotics/kuka-robotics-ornamentation-pattern-metal-surface.webp`,
        alt: 'Finished concentric hexagonal ornamentation drawn in red ink on paper',
      },
      {
        src: `${A}/06-kuka-robotics/kuka-robotics-plotted-serpentine-drawing-resolved.webp`,
        alt: 'A long roll of paper marked edge to edge with a dotted magenta and pink serpentine ribbon pattern',
        fit: 'contain',
      },
      {
        src: `${A}/06-kuka-robotics/kuka-robotics-metal-surface-sanding-end-effector.webp`,
        alt: 'The KUKA arm with a pen end effector plotting a radial wireframe pattern on black paper, a live monitor behind',
        fit: 'contain',
      },
      {
        src: `${A}/13-texas-robotics/texas-robotics-robot-device-still.webp`,
        alt: 'The Texas Robotics device at rest',
      },
    ],
  },
  {
    // NEW (2026-07-13). Framing from Clay: an experiment, not a finished product. Lineage is MIT
    // Design Intelligence Lab's Large Language Objects (physical bodies for language models). The
    // lamp runs "Dream Machine", a tool to DJ a drawing: you sketch, then project generated imagery
    // over the sketch to push the idea further. TODO(Daniel): confirm the year and your exact role,
    // and whether "Dream Machine" is the final name for the projection tool.
    n: '06',
    title: 'LLO: Dream Machine',
    by: 'daniel',
    year: '2024',
    description:
      'An experiment, not a product: a desk lamp built to give a language model a body, after MIT’s Large Language Objects. It runs Dream Machine, a tool to DJ a drawing, you sketch, then project imagery back over the sketch to expand the idea. The armature is plywood, pulleys, and string, driven by a small control box.',
    learned:
      'It stays deliberately unfinished. The question was whether a model feels different once it has a posture and sits on the desk with you, not whether it ships.',
    images: [
      {
        src: `${A}/14-large-language-object/large-language-object-lamp.webp`,
        alt: 'The Large Language Object, a plywood articulated desk lamp on a wooden base with pulleys, red string, and a separate control box',
        caption: 'The Large Language Object, a lamp that gives a model a body',
      },
      {
        src: `${A}/14-large-language-object/large-language-object-draft-1.webp`,
        alt: 'A working draft of the Large Language Object lamp',
        caption: 'A working draft',
      },
      {
        src: `${A}/14-large-language-object/large-language-object-draft-2.webp`,
        alt: 'A second working draft of the Large Language Object lamp',
        caption: 'A second working draft',
      },
    ],
  },
  {
    // NEW (2026-07-13). Resia is Clay's startup. TODO(Daniel): confirm the year and the current
    // status of the product.
    n: '07',
    title: 'Resia',
    by: 'clay',
    year: '2024',
    description:
      'An AI remodeling platform that carries a homeowner from idea to finished job in one place: generate the design, estimate the cost, write the contract, and manage the build.',
    learned:
      'A renovation is a chain of handoffs, and most of the pain is in the seams; putting the whole chain in one tool is where the leverage is.',
    images: [
      {
        src: `${A}/12-resia/resia-product-screenshot-1.webp`,
        alt: 'The Resia landing page, a one-stop remodeling solution to generate, estimate, contract, and manage a renovation',
        caption: 'One stop, from generate to manage',
      },
      {
        src: `${A}/12-resia/resia-brand-artboard.webp`,
        alt: 'A Resia brand artboard, a kitchen shown before and after a renovation with the line "Kitchen Renovation Made Simple"',
        caption: 'Before and after, the renovation made simple',
      },
      {
        src: `${A}/12-resia/resia-product-screenshot-2.webp`,
        alt: 'A second Resia product screenshot',
        caption: 'Inside the product',
      },
      {
        src: `${A}/12-resia/resia-logo.webp`,
        alt: 'The Resia logo',
        caption: 'The mark',
        fit: 'contain',
      },
    ],
  },
];
