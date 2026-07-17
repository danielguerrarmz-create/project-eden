/**
 * clusters.ts — the About timeline's CONTENT, and the box each piece of it occupies.
 *
 * WHY THIS IS ITS OWN FILE, because it was carved out of CrossPathsTimeline.tsx on 2026-07-17 and the
 * reason is structural rather than tidiness:
 *
 * **THE AXIS IS DERIVED FROM THE CONTENT NOW** (round 10, the band packing). Each year's band is as
 * long as its own content needs, which means the axis has to READ the clusters — and the axis is
 * evaluated at module init, above where `CLUSTERS` used to be declared, so it could not. The old
 * `SLOPE` note carried a TODO saying exactly this: "it needs a reshuffle rather than an expression".
 * This is the reshuffle. An import edge is the one dependency order that cannot be got wrong by
 * accident: the data has no idea the geometry exists, and the geometry cannot be evaluated before the
 * data is.
 *
 * So the rule for this file is: **DATA AND THE SHAPE OF DATA ONLY.** Nothing here may import from
 * CrossPathsTimeline.tsx — that direction is the whole point, and a cycle here would put `CLUSTERS`
 * back in the temporal dead zone the split exists to escape.
 */

export type Side = 'left' | 'right';
export type PlateTier = 'floor' | 'standard' | 'hero' | 'showcase';

/** One picture on a plate: a still, or a looping video (webm + mp4 + poster). */
export interface Plate {
  /** Public path to the image, or the POSTER still for a video. */
  src: string;
  /**
   * Intrinsic aspect ratio (width / height), MEASURED from the file — never guessed, and never the
   * shape you wish it were. The plate's box is derived from THIS (see TIER), which is the whole
   * point: an image is never asked to fit a box, the box is built to fit the image.
   *
   * Measured 2026-07-16 by loading every asset and reading naturalWidth/naturalHeight; the twelve
   * that also appear in projects.ts agreed with its authored ratios exactly, and a test pins that
   * they keep agreeing. If an asset is swapped, re-measure.
   */
  ratio: number;
  alt: string;
  /** Renders and photos crop with 'cover'; figures, logos, UI and line drawings use 'contain'
   *  so nothing with baked-in text ever gets cropped. */
  fit?: 'cover' | 'contain';
  /** Present when this plate is really a looping video. */
  video?: { webm: string; mp4: string; rate?: number };
  /** No picture yet: draws an honest empty plate instead of inventing one. */
  pending?: boolean;
}

/** One node on the spine. clusterIndex 0 is the lead (hero or showcase); later indices stack below
 *  it as standard siblings sharing the same branch point. */
export interface Node {
  tier: PlateTier;
  media: Plate;
}

/** A cluster: one branch point on the spine (a fork) with one or more stacked plate nodes. */
export interface Cluster {
  id: string;
  /** True event year → the spine anchor this cluster's branch(es) fork from. */
  year: number;
  side: Side;
  /** ONE-line hint, from the allowed set only. The specifics live in "The Work" list below. */
  hint: string;
  nodes: Node[];
}

const A = '/assets/projects';
/** The timeline's own photographs — the five Daniel shot/supplied for the page itself (orientation,
 *  studio, DAC pin-up, Resia pitch, graduation) rather than for a project. They live apart from
 *  `/assets/projects` because they are not a project's documentation; they are the page's narrative. */
const T = '/assets/about/timeline';

/* ------------------------------ the plate box ----------------------------- */

/**
 * Plate tiers. The FLOOR is a reference only (nothing is built at it); the smallest plate actually
 * drawn is STANDARD. Images dominate.
 *
 * A TIER IS AN AREA BUDGET, NOT A BOX (2026-07-16, round 3). Daniel: "Some of the timeline images
 * are not displayed properly. For example the one testing the Plentify prototype has white spaces on
 * the left and right side. I want you to scale to fit the image properly so it shows in full without
 * getting rid of the context."
 *
 * These used to be literal `{ w, h }` boxes at 3:2, and EVERY plate was forced into its tier's shape:
 * `fit:'contain'` letterboxed the image inside the box against a white rect (Plentify's compression
 * test is 976x975 — square — in a 320x213 box, hence his white bars), and `fit:'cover'` sliced the
 * image to fill (which is the fix he explicitly ruled out: "without getting rid of the context").
 * Same disease as the detail hero's old 505x557 portrait box, in a different organ.
 *
 * So the box is now DERIVED from the plate's own measured ratio, and the tier only says how much
 * PAPER that plate is worth: `plateBox` gives every plate in a tier the same area at its own shape.
 * A square and a 16:9 in the same tier read as equally important, which a fixed box cannot do — it
 * makes one of them small or crops it. The w/h below are kept as the reference box the area is taken
 * from (they are the old values, so 3:2 plates are sized exactly as before and nothing that already
 * looked right moved).
 */
const TIER: Record<PlateTier, { w: number; h: number }> = {
  floor: { w: 240, h: 150 }, // reference size only — the hard minimum, never instantiated
  standard: { w: 264, h: 176 },
  hero: { w: 320, h: 213 },
  // The biggest tier, and ROUND 10 ANSWERED WHAT IT IS FOR — by elimination, which is worth writing
  // down because the answer is the opposite of what the tier was reserved for.
  //
  // It read "reserved for the two bookends: ut-austin and the NYC door". Round 9 cashed that in with
  // the 2021 orientation call and added the 2026 graduation to close the drawing, so three nodes
  // claimed it. Then Daniel looked at the page and sent both BOOKENDS down: the orientation plate
  // "smaller" (-> hero, item 10) and the graduation "much smaller" (-> standard, item 11).
  //
  // So the showcase tier now belongs to the NYC door ALONE — the one plate that never asked for it,
  // and the only one still holding it from when it was the last plate in the drawing. The old
  // TODO(Daniel) asked whether to drop the door to `hero` so the tier would mean "the bookends"
  // again; that question is dead, because the bookends left. It is now a tier with one member, which
  // is a tier that has stopped being a tier. TODO(Daniel): either the door earns 400 on its own
  // merit, or showcase folds into `hero` and this row goes. Not guessed here — it is a look call and
  // he is about to look at the page anyway.
  showcase: { w: 400, h: 267 },
};

/**
 * A plate's real box: its tier's AREA, at the image's own ratio. Pure and exported for the contract
 * test, which is the one that matters here — every plate's box ratio equals its image's ratio, so
 * nothing is ever letterboxed or cropped again.
 */
export function plateBox(tier: PlateTier, ratio: number): { w: number; h: number } {
  const area = TIER[tier].w * TIER[tier].h;
  return { w: Math.sqrt(area * ratio), h: Math.sqrt(area / ratio) };
}

/* --------------------------------- the graph ------------------------------ */

/**
 * The content graph, node by node. `nodes[0]` is the lead (hero, or showcase for the two bookends);
 * later nodes stack below as standard siblings. The clusters are agnostic to the winding finale and
 * twist-fuse beginning — this list is content only, and the geometry above holds it whatever it is.
 */
export const CLUSTERS: Cluster[] = [
  {
    /**
     * THE FIRST PLATE, and half of the page's bracket. Daniel: "put this image as our FIRST, our
     * school orientation." It is a UT orientation Zoom grid — forty-odd strangers in forty-odd
     * boxes, hook-'em hands, nobody having met anybody. The page opens on the paths NOT crossed
     * yet and closes on the two of them graduating (see `graduation` at the foot of this list),
     * which is the same bracket the copy makes with "Bower is new." / "The obsession is real, and
     * it is old." The showcase tier was already reserved for exactly this (see TIER) — the bookend
     * it names as "ut-austin" had been waiting for an asset since the tier was written.
     *
     * SHIPPED BY DANIEL'S EXPLICIT RULING, 2026-07-16. This is the DECISION, recorded — not a
     * justification for it, and the difference is the point. Round 9 left a note here claiming the
     * names are illegible at 640; round 10 measured it and it is overstated; and a false rationale
     * left in the code is how the next agent either "re-mitigates" something already decided, or
     * trusts the claim and reuses it somewhere it is not true. So, what is actually true:
     *
     *   - The photograph shows ~40 identifiable UT students with their NAMES printed under their
     *     faces. THIS REPO IS PUBLIC (`danielguerrarmz-create/project-eden`), so `git add` is
     *     `publish` — the line is `git push`, not the merge — and a public push is effectively
     *     permanent, because it can be cached and indexed even if later deleted.
     *   - MEASURED, by cropping the caption strip out of both files and upscaling 6x nearest (what a
     *     determined viewer actually does): at 828 the names read outright; at 640 they are badly
     *     degraded but a few stay partly guessable. "Harder" is not "illegible".
     *   - AND LEGIBILITY IS LARGELY A RED HERRING. With every name unreadable this is still ~40
     *     identifiable FACES on a company's public About page. The face is the personal data; the
     *     name only compounds it.
     *
     * Daniel was told all of that, in those terms, and was offered: crop to the two of them, drop it,
     * ship knowingly, or assert consent. He did not claim consent. He chose to ship the full frame.
     * It is his photograph, his classmates, his company's page, and his call to make. Do not
     * re-litigate it here; if it ever needs revisiting that is a conversation with him, not a commit.
     *
     * IT SHIPS AT 640, NOT THE 828, and that stays deliberate even though the downscale is no longer
     * load-bearing for the ruling: it costs nothing visually and it is a real, if partial, reduction
     * in exposure, so there is no reason to upgrade the resolution now. The 828 original stays out of
     * the repo, at `restless-egg/_photo-originals/timeline/`.
     */
    id: 'origin-2021',
    year: 2021.1,
    side: 'right',
    hint: '',
    nodes: [
      {
        // SMALLER (round 10, item 10). `showcase` -> `hero`, one tier down: 400 wide to 320, a 20%
        // cut. One tier, not two — he said "smaller" of this and "much smaller" of the graduation
        // plate, and those are different words.
        //
        // A SIDE EFFECT WORTH NAMING AND NOT ACTING ON: a smaller plate also renders ~40 identifiable
        // faces smaller, which is a happy consequence of a composition note. It is NOT a reason to
        // shrink it further than he asked, and NOT a reason to reopen the ruling — he has ruled
        // twice, knowingly, on the faces-and-consent framing. See the note at the head of this
        // cluster. Do not quietly re-mitigate a decision by tuning a number.
        tier: 'hero',
        media: {
          src: `${T}/2021-orientation-zoom.webp`,
          ratio: 1.5725,
          alt: 'A UT Austin orientation call in 2021: a grid of some forty new students in their own boxes, hook-’em hands raised, none of them having met yet',
        },
      },
    ],
  },
  {
    // The studio, before the first project: the two of them at one desk at night, one rendering,
    // one watching over his shoulder. Daniel called it "one of our beginning placeholder images".
    // Which founder is which is NOT asserted here — the filename says both names and does not say
    // who sits where, and this page has already misattributed a founder once (see the TEAM/ledger
    // note in CLAUDE.md). "The two cofounders" is what the picture actually supports.
    id: 'early-2022',
    year: 2022.0,
    side: 'left',
    hint: '',
    nodes: [
      {
        tier: 'standard',
        media: {
          src: `${T}/studio-desks.webp`,
          ratio: 1.5009,
          alt: 'The two cofounders at a shared architecture-studio desk late at night, one at the monitor mid-render, the other standing behind it, the desk buried in drawings and drink cups',
        },
      },
    ],
  },
  {
    id: 'medical',
    year: 2022.6,
    side: 'right',
    hint: '',
    nodes: [
      /*
       * THE DRAWING LEADS HERE TOO (round 10, item 12). Daniel: the Origami Device rendering comes
       * out of the timeline, the main brochure drawing goes in.
       *
       * READ THIS WITH THE PROJECT HERO SWAP, NOT AS A SECOND DECISION. He moved the same asset to
       * the front of BOTH surfaces in the same review: this plate and the project's hero in
       * projects.ts. The drawing is the face of the project now and the hospital photograph is
       * supporting evidence, in both places, consistently. It only looks like churn (and like
       * reversing round 8 twice in one night) if you read the two commits apart.
       *
       * `fit: 'contain'` because it is a paper sheet and wants a white ground under it, same as the
       * assembly sheets on the project. Ratio 1.2936 MEASURED off the file (793x613, ffprobe) rather
       * than inherited from the photograph it replaces — the outgoing staged shot is 1.2795, close
       * enough to look right and wrong enough to letterbox.
       */
      {
        tier: 'hero',
        media: {
          src: `${A}/11-wound-care-kenya/wound-care-kenya-brochure-cover.png`,
          ratio: 1.2936,
          fit: 'contain',
          alt: 'The brochure cover: the finished wedge, the materials needed, the two-hour turning interval, and the device in use under a patient',
        },
      },
      {
        tier: 'standard',
        media: {
          src: `${A}/11-wound-care-kenya/wound-care-kenya-in-hospital-device-test.webp`,
          ratio: 1.2125,
          alt: 'The device tested in hospital at Moi Teaching Hospital, Kenya',
        },
      },
    ],
  },
  {
    id: 'testfit',
    year: 2023.0,
    side: 'left',
    hint: '',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/15-testfit/testfit-backlit-logo-sign-late-night.webp`,
          ratio: 0.5637,
          alt: 'The backlit TestFit logo sign on an office wall at 12:56 in the morning, the late nights of a startup',
        },
      },
    ],
  },
  {
    id: 'together',
    year: 2023.4,
    side: 'left',
    hint: '',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/01-synergy/synergy-cosmos-growth-loop-poster.webp`,
          ratio: 1.7778,
          alt: 'The Plentify building growing from bare structure to fully planted',
          video: {
            webm: `${A}/01-synergy/synergy-cosmos-growth-loop.webm`,
            mp4: `${A}/01-synergy/synergy-cosmos-growth-loop.mp4`,
            rate: 0.72,
          },
        },
      },
    ],
  },
  {
    id: 'research',
    year: 2023.55,
    side: 'left',
    hint: 'Research Paper',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/08-synthetic-vision/synthetic-vision-patch-probe-saliency-heatmaps.webp`,
          ratio: 1.2344,
          alt: 'Saliency heatmaps over architectural fragments, warm colour marking each geometric primitive the model reads',
          fit: 'contain',
        },
      },
    ],
  },
  {
    id: 'making',
    year: 2024.0,
    side: 'right',
    hint: '',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/01-synergy/synergy-cosmos-compression-test.webp`,
          ratio: 1.001,
          alt: 'A Plentify sample under compression on the MTS Insight testing machine, tested +30% stronger than hempcrete',
          fit: 'contain',
        },
      },
    ],
  },
  {
    id: 'robotics',
    year: 2024.2,
    side: 'right',
    hint: '',
    nodes: [
      {
        // The KUKA robot (Daniel's freshly-shot loop) leads the robotics moment; Clay's Texas robot
        // is its companion below. Both are the mains of the "Robots as Instruments" project.
        tier: 'hero',
        media: {
          src: `${A}/06-kuka-robotics/kuka-robotics-robot-loop-poster.webp`,
          ratio: 1.7778,
          alt: 'A KUKA robot arm sanding an aluminium sheet, tooling an ornamented surface',
          video: {
            webm: `${A}/06-kuka-robotics/kuka-robotics-robot-loop.webm`,
            mp4: `${A}/06-kuka-robotics/kuka-robotics-robot-loop.mp4`,
            rate: 1,
          },
        },
      },
      {
        tier: 'standard',
        media: {
          src: `${A}/13-texas-robotics/texas-robotics-robot-device-loop-poster.webp`,
          ratio: 1.7937,
          alt: 'A Texas Robotics mock-up robot device in motion',
          video: {
            webm: `${A}/13-texas-robotics/texas-robotics-robot-device-loop.webm`,
            mp4: `${A}/13-texas-robotics/texas-robotics-robot-device-loop.mp4`,
            rate: 0.85,
          },
        },
      },
    ],
  },
  {
    id: 'llo',
    year: 2024.5,
    side: 'right',
    hint: 'LLO: Dream Machine',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/14-large-language-object/large-language-object-lamp.webp`,
          ratio: 1.3389,
          alt: 'The Large Language Object, a plywood articulated desk lamp on a wooden base with pulleys and a control box',
        },
      },
    ],
  },
  {
    id: 'resia',
    year: 2024.5,
    side: 'left',
    hint: 'Resia: AI-Remodel Software',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/12-resia/resia-product-screenshot-1.webp`,
          ratio: 1.8397,
          alt: 'The Resia landing page, a one-stop remodeling solution to generate, estimate, contract, and manage a renovation',
        },
      },
      {
        // Daniel: "next to Resia." Clay presenting the pitch — and this one IS named, because three
        // things agree: the ledger has Resia as `by: 'clay'`, Daniel's own filename said `clay`, and
        // only one person is in frame. The deck on the screen reads "Resi.AI", not "Resia"; the alt
        // says what the slide says rather than quietly correcting the ledger's name onto it.
        tier: 'standard',
        media: {
          src: `${T}/resia-pitch.webp`,
          ratio: 0.75,
          alt: 'Clay Seifert presenting the Resia startup pitch deck, its title slide reading “Resi.AI — Removing the Waste from Home Renovation”',
        },
      },
    ],
  },
  {
    id: 'dougherty',
    year: 2024.6,
    side: 'left',
    hint: '',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/05-dougherty/dougherty-arts-center-catenary-entrance-skyline-money-shot.webp`,
          ratio: 1.7778,
          alt: 'The catenary arch entrances of the Dougherty Arts Center, the Austin skyline behind',
        },
      },
      {
        tier: 'standard',
        media: {
          src: `${A}/05-dougherty/dougherty-arts-center-physical-model-cardboard-catenary.webp`,
          ratio: 1.4997,
          alt: 'The cardboard physical model of the Dougherty Arts Center, its white catenary arches standing in the round',
        },
      },
      {
        // Daniel: "around our DAC project." The pin-up wall itself — the sheets (A002–A014, all
        // stamped DAC) and both physical models in one frame, with the two of them standing either
        // end of it. It earns its place beside the render and the model because it is the only plate
        // that shows the WORK as it was actually presented: on a wall, defended in a room.
        tier: 'standard',
        media: {
          src: `${T}/dac-pinup.webp`,
          ratio: 1.3333,
          alt: 'The Dougherty Arts Center pin-up: a studio wall of DAC drawing sheets and renders with both cardboard models on stands, the two cofounders standing at either end',
        },
      },
    ],
  },
  {
    id: 'factory',
    year: 2025.3,
    side: 'left',
    hint: '',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/10-robotic-factory/robotic-factory-section-assembly-poster.webp`,
          ratio: 1.9375,
          alt: 'The robotic factory long section assembling itself, vaulted halls, chimneys and planted terraces building up in sequence',
          video: {
            webm: `${A}/10-robotic-factory/robotic-factory-section-assembly-loop.webm`,
            mp4: `${A}/10-robotic-factory/robotic-factory-section-assembly-loop.mp4`,
            rate: 0.85,
          },
        },
      },
    ],
  },
  {
    id: 'newyork',
    year: 2025.0,
    side: 'right',
    hint: 'NYC: Rogers Partners',
    nodes: [
      {
        tier: 'showcase',
        media: {
          src: `${A}/16-rogers-partners-nyc/rogers-partners-nyc-door-elevation-drawing.webp`,
          ratio: 1.597,
          alt: 'A Rogers Partners door elevation drawing, an arched double door with ironwork tracery, dimensioned',
          fit: 'contain',
        },
      },
      {
        tier: 'standard',
        media: {
          src: `${A}/16-rogers-partners-nyc/rogers-partners-nyc-office-desk-selfie.webp`,
          ratio: 1.7778,
          alt: 'Daniel at his dual-monitor desk in the Rogers Partners office in New York',
        },
      },
    ],
  },
  {
    /**
     * THE LAST PLATE, and the other half of the bracket. Daniel: "put this image as our LAST, we
     * just graduated." Orientation (2021, `origin-2021`) opens on strangers who have not met; this
     * closes on them graduating. Both bookends are `showcase` and both sit RIGHT, so they rhyme
     * across the length of the drawing — which is also what balances the lanes at 7 clusters a side.
     *
     * THIS IS THE FIRST CLUSTER 2026 HAS EVER HAD, and it changes a documented invariant: the
     * `yearLabelYs` note used to say 2026 has no work to sit beside, so its label fell back to the
     * axis. Now the 2026 label follows this plate like every other year follows its first plate.
     * The fallback is still live and still correct — it is just no longer 2026 that exercises it.
     *
     * FOUR people are in the frame, not two, and only the two cofounders are Bower's. The alt says
     * "four graduates" and names nobody: naming them would mean identifying two people who are not
     * part of this company on the company's own About page.
     */
    id: 'graduation',
    year: 2026.0,
    side: 'right',
    hint: '',
    nodes: [
      {
        // MUCH SMALLER (round 10, item 11). `showcase` -> `standard`, two tiers down: 400 wide to 264,
        // a 34% cut. Daniel said "much smaller" here and only "smaller" of the orientation plate, so
        // the two are deliberately different magnitudes rather than one shared constant — the
        // orientation drops one tier, this drops two. It is a PORTRAIT plate at 0.75, so at showcase
        // it stood 356 tall against the drawing's other bookend and read as the loudest thing on the
        // page; the tier change takes it to ~235.
        tier: 'standard',
        media: {
          src: `${T}/2026-graduation.webp`,
          ratio: 0.75,
          alt: 'Four graduates in Texas stoles at the 2026 UT Austin commencement, arms around each other in the packed stadium, fireworks over the jumbotron behind them',
        },
      },
    ],
  },
];

/** The last titled year the drawing ticks. Derived from the content rather than typed twice: it was
 *  a hand-kept `const MAX_YEAR = 2026` next to the axis, one asset away from disagreeing with the
 *  list it describes. */
export const MAX_YEAR = Math.max(...CLUSTERS.map((c) => Math.floor(c.year)));

/** The years the drawing ticks and labels, derived from the work rather than written out. This was a
 *  hand-maintained literal at three call sites; a fourth copy is how a year quietly gets ornamented
 *  but never labelled. */
export const YEAR_TICKS: readonly number[] = [...new Set(CLUSTERS.map((c) => Math.floor(c.year)))].sort(
  (a, b) => a - b,
);

/**
 * Minimum vertical gap between two stacked siblings in ONE cluster — their bounding boxes never come
 * closer than this (the no-overlap contract). It lives here because it is the unit the band packing
 * measures in: see BAND_GAP, which is three of these.
 */
export const CLUSTER_GAP_Y = 40;

