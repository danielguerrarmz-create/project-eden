/**
 * AboutPage.tsx — the dedicated projects page (#/about).
 *
 * Order: the header (title + the two questions) drawn AS the cross-paths timeline, then the
 * co-founders (Clay + Daniel), then the projects.
 *
 * The projects use a master-detail LIST: a SELECTION MENU on the left — one FLAT reverse-
 * chronological list — and on the right the selected project, laid out in ROWS (2026-07-16, round 2;
 * Daniel: "What if we switch them to rows instead where the main images of the projects show up at
 * the top... and have the project information at the bottom"):
 *
 *   row 1  the PICTURES: a large landscape HERO (image or video) with the supporting images standing
 *          beside it as a vertical filmstrip. See SupportingStrip for why the strip is vertical —
 *          it is not a style choice, it is what buys the hero its aspect ratio.
 *   row 2  the INFORMATION BAND, reading across under the picture: title · credit · description,
 *          then awards and collaborators, then the "What we learned" takeaway. See ProjectInfoBand
 *          for why the columns are split the way they are.
 *
 * The detail is height-locked to the viewport, which is what makes the master-detail an instrument
 * rather than a document: hovering the menu swaps the detail IN PLACE, and nothing below it moves.
 * That lock is also the whole constraint the two comments above are negotiating with.
 *
 * The hero is the first image by default and is hand-selectable per project (see `hero` in
 * about/projects.ts). On mobile the projects stack, each with its images and text inline. Captions
 * live only in the lightbox.
 *
 * Images are REAL, imported from Daniel's portfolio (see about/projects.ts).
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashHeader } from './splash/SplashHeader';
import { Footer } from '../ui/Footer';
import { OculusMark } from '../ui/OculusMark';
import { srcSetFor, SIZES } from '../ui/responsiveImg';
import { useReducedMotion } from '../ui/useReducedMotion';
import { useAutoplayVideo } from './about/useAutoplayVideo';
import { packWall } from './about/pack';
import {
  PROJECTS,
  TEAM,
  TEAM_CODA,
  AUTHOR_LABEL,
  type Project,
  type ProjectImage,
  type TeamMember,
} from './about/projects';
import { AboutIntro, shouldPlayAboutIntro } from './about/AboutIntro';
import {
  CrossPathsTimeline,
  DESCENT_EXIT_FRAC,
  INK_SEPIA,
  INK_SEPIA_TEXT,
  SPINE_W,
  TIMELINE_W,
} from './about/CrossPathsTimeline';
import { requestGarland } from '../engine/gongbi/painter';
import { resample } from '../engine/gongbi/garland';
import { armPts, polyD, taperRuns, trunkPts, PAREN_STATIONS, PAREN_ORGANS, type ParenLayout, type TaperRun } from './about/parenthesis';
import { PAGE_SPECIES } from './about/species';
import {
  GROWN_BY,
  clamp01,
  dashProps,
  growAt,
  ORGAN_DISC_R,
  organAt,
  polyLen,
  readerLead,
  STEM_SHARE,
  stemDrawAt,
  revealSpanPx,
} from './about/reveal';
import { usePageCardLine, useTimelineFrameScale } from './about/usePageCardLine';

/** ONE colour, page-wide. There is no longer a Clay-blue / Daniel-green split: the authorship
 *  is already stated in words by the meta line, so saying it a second time in colour only
 *  fragmented the page. Sepia is the practice's colour and everything selected takes it.
 *
 *  Two entry points, one colour: STRUCTURE (tint bars, row grounds, stems, leaders) takes
 *  `authorColor`, and GLYPHS take `authorTextColor` — the selected row lays an 8% sepia tint
 *  under its own sepia text, and INK_SEPIA does not clear AA on that ground. See the constants. */
function authorColor(_by: Project['by']): string {
  return INK_SEPIA;
}

function authorTextColor(_by: Project['by']): string {
  return INK_SEPIA_TEXT;
}

/** The page title, shared verbatim between the header and the intro's flying title so they
 *  land coincident — and it IS the narration's payoff line. */
const TITLE = "We've been chasing it for five years.";
const TITLE_CLASS =
  'font-serifDisplay text-[clamp(1.6rem,4.4vw,3rem)] font-medium leading-[1.12] tracking-[-0.01em] text-inkBlack';

/** The two questions the whole practice chases, presented apart and large.
 *  (Exported: the scroll About draft at #/about/scroll sets the same two questions,
 *  and sharing the const keeps the copy from drifting between the two pages.) */
export const QUESTIONS = [
  { label: 'Question one', text: 'How can architecture be grown, not only built?' },
  { label: 'Question two', text: 'How does designing alongside AI reshape what we can make?' },
];

/** Decide synchronously (first client render) whether the narration intro should play.
 *  It plays on EVERY visit (not session-gated) — only reduced-motion opts out. */
function decideAboutIntro(): boolean {
  if (typeof window === 'undefined') return false;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  return shouldPlayAboutIntro(reduced, false);
}

/** The mono meta pair (author + year). */
function Meta({ project, className = '' }: { project: Project; className?: string }) {
  return (
    <span
      className={`font-mono text-[11px] uppercase tracking-[0.14em] ${className}`}
      style={{ color: authorTextColor(project.by) }}
    >
      {AUTHOR_LABEL[project.by]} · {project.year}
    </span>
  );
}

/* ------------------------------- media tiles ------------------------------ */

/** Split a project's images into the hero and the rest. The hero is the image flagged `hero`, or the
 *  first image when none is flagged (the default). The rest keep their authored order. */
function heroSplit(images: ProjectImage[]): { hero: ProjectImage; rest: ProjectImage[] } {
  const idx = images.findIndex((im) => im.hero);
  const heroIdx = idx >= 0 ? idx : 0;
  return { hero: images[heroIdx], rest: images.filter((_, i) => i !== heroIdx) };
}

/**
 * The one frame-class recipe for a project image, shared by ProjectVideoEl and ProjectImg so the two
 * cannot drift — they each carried a byte-identical copy of this ternary. Every branch and every class
 * string is preserved verbatim; this is a dedupe, not a redesign. The behaviour, including the
 * licensed-crop path (`fillHero`) and the `bg-white p-1.5` figure default, is decided by the SAME
 * booleans both callers already compute, so nothing about which class lands where has changed.
 */
function imageFrameClass({
  brick,
  fillHero,
  fit,
  fill,
  contain,
  className,
}: {
  brick: boolean;
  fillHero: boolean;
  fit: boolean;
  fill: boolean;
  contain: boolean;
  className: string;
}): string {
  return brick
    ? `block h-full w-full object-contain ${contain ? 'bg-paperVellum' : 'bg-paperDeep/40'} ${className}`
    : fillHero
      ? `block h-full w-full object-cover ${className}`
      : fit
        ? `${FIT_FRAME} ${className}`
        : fill
          ? `block h-full w-full ${contain ? 'bg-paperVellum object-contain' : 'bg-paperDeep/40 object-cover'} ${className}`
          : `w-full ${contain ? 'bg-white object-contain p-1.5' : 'bg-paperDeep/40 object-cover'} ${className}`;
}

/** One framed image on the paper ground. Renders crop to a clean tile with object-cover; paper
 *  figures set fit:'contain' so nothing is cut, on a white ground.
 *
 *  Every interactive copy is a BUTTON: click it and it opens full-bleed in the Lightbox. The image
 *  carries a `layoutId` so framer-motion morphs the tile itself up to the large view (a shared-element
 *  transition) rather than cross-fading a second copy of it. */
function ProjectVideoEl({
  image,
  className,
  contain,
  reduced,
  fill = false,
  fit = false,
  brick = false,
}: {
  image: ProjectImage;
  className: string;
  contain: boolean;
  reduced: boolean;
  /** Fixed-region mode: fill the parent tile edge-to-edge (h-full w-full) with object-fit, instead of
   *  taking a width and its own aspect. Used by the fixed two-region gallery. */
  fill?: boolean;
  /** Hero mode — see FIT_FRAME. */
  fit?: boolean;
  /** Wall mode — see ProjectImg's `brick`. */
  brick?: boolean;
}) {
  const { ref, start } = useAutoplayVideo(image.video?.rate ?? 1);

  // The licensed crop has to live here too, because the one asset that carries it IS a video (Robots'
  // KUKA loop) — ProjectImg's copy of this branch never sees it. Same gate: the asset's own flag,
  // nothing else. See ProjectImage.fillHero.
  const fillHero = fit && image.fillHero === true;
  const frame = imageFrameClass({ brick, fillHero, fit, fill, contain, className });

  // Reduced motion gets the poster still. Nothing moves.
  if (reduced)
    return (
      <img
        src={image.src}
        srcSet={srcSetFor(image.src)}
        sizes={srcSetFor(image.src) ? SIZES.galleryPlate : undefined}
        alt={image.alt}
        loading="lazy"
        decoding="async"
        className={frame}
        data-licensed-crop={fillHero || undefined}
      />
    );

  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      poster={image.src}
      aria-label={image.alt}
      className={frame}
      data-licensed-crop={fillHero || undefined}
      onLoadedData={start}
      onCanPlay={start}
    >
      {image.video?.webm && <source src={image.video.webm} type="video/webm" />}
      <source src={image.video?.mp4} type="video/mp4" />
    </video>
  );
}

/** The "image to come" plate for a `pending` asset: an inert dashed frame, never interactive and never
 *  in the lightbox set. `fill` makes it fill a fixed tile; otherwise it takes `className` for its size. */
function PendingPlate({ fill, className = '' }: { fill: boolean; className?: string }) {
  const base = fill ? 'h-full w-full' : `w-full ${className}`;
  return (
    <div
      aria-hidden
      className={`grid place-items-center border border-dashed border-inkBlack/25 bg-paperDeep/25 ${base}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">
        Image to come
      </span>
    </div>
  );
}

function ProjectImg({
  image,
  className = '',
  onOpen,
  reduced = false,
  fill = false,
  fit = false,
  brick = false,
}: {
  image: ProjectImage;
  className?: string;
  onOpen?: (image: ProjectImage) => void;
  reduced?: boolean;
  /** Fixed-region mode: fill the parent tile edge-to-edge (h-full w-full) with object-fit, instead of
   *  taking a width and its own aspect. Used by the fixed two-region gallery. */
  fill?: boolean;
  /** Hero mode — see FIT_FRAME. */
  fit?: boolean;
  /**
   * WALL MODE — the desktop pack (see pack.ts). The cell this sits in was BUILT to this picture's
   * authored ratio, so the box and the picture are already the same shape and object-fit has nothing
   * left to resolve. That is the same argument as FIT_FRAME, arrived at from the other side: FIT_FRAME
   * makes the element size itself inside a given box; a brick is given a box that is already its size.
   *
   * IT IS `object-contain`, AND THAT IS THE POINT rather than an arbitrary pick between two no-ops.
   * When the box matches the picture, `cover` and `contain` paint identically — so the choice is
   * really about WHAT HAPPENS WHEN THE AUTHORED RATIO IS WRONG. `cover` would silently crop, which is
   * this page's most expensive bug ("a cropped photo still looks like a photo, so nobody notices").
   * `contain` letterboxes: a visible vellum band, in the one place a human is looking, and
   * `qa/project-media.mjs` reads the same fact off the element's rect. So a bad number in projects.ts
   * announces itself instead of quietly eating a picture. **Nothing in the wall can be cropped by
   * object-fit — not by policy, by construction.**
   *
   * `fillHero` IS DELIBERATELY NOT HONOURED HERE, and it is not an oversight — see the note in
   * ListView where the wall is built.
   */
  brick?: boolean;
}) {
  // A pending image has no asset yet: render the inert placeholder plate, never a button.
  if (image.pending) return <PendingPlate fill={fill || brick} className={className} />;

  const contain = image.fit === 'contain';
  /*
   * THE LICENSED CROP, and it is deliberately gated on the asset's OWN flag rather than on `fit`.
   * `fillHero` fills the hero region and crops the overflow — see ProjectImage.fillHero for why one
   * asset has it and why it is not a precedent. It is reachable ONLY by an image that names itself,
   * so no `fit: 'cover'` and no future hero can wander into a crop by default. That gate is the whole
   * safety of it: the banned pattern got in last time by being the DEFAULT for a whole branch.
   *
   * `data-licensed-crop` EXISTS FOR THE INSTRUMENTS, and it is not decoration. A licensed crop is, by
   * construction, a deliberate ratio deviation — which is indistinguishable in a rect measurement from
   * the regression the guard exists to catch. Without a marker in the DOM, `qa/project-media.mjs` can
   * only be wrong in one of two directions: fail forever on Daniel's ruling, or drop the crop check for
   * every hero to accommodate one. The marker lets it do the correct third thing — allow the deviation
   * HERE and nowhere else, and count the licences so a second one cannot appear quietly. The licence's
   * scope is enforced by `projects.test.ts`, which pins it to the one asset by src.
   */
  const fillHero = fit && image.fillHero === true;
  const frame = imageFrameClass({ brick, fillHero, fit, fill, contain, className });
  const btnClass = `group relative block ${brick || fillHero ? 'h-full w-full' : fit ? 'max-h-full max-w-full' : fill ? 'h-full w-full' : 'w-full'} cursor-zoom-in overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inkBlack`;

  // A video tile stays out of the shared-element morph: framer-motion cannot morph a <video>
  // into an <img> without a visible swap. It still opens the lightbox, on its poster.
  if (image.video) {
    const el = <ProjectVideoEl image={image} className={className} contain={contain} reduced={reduced} fill={fill} fit={fit} brick={brick} />;
    if (!onOpen) return el;
    return (
      <button type="button" onClick={() => onOpen(image)} aria-label={`Enlarge: ${image.alt}`} className={btnClass}>
        {el}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-inkBlack/0 transition-colors duration-300 group-hover:bg-inkBlack/[0.06] motion-reduce:transition-none"
        />
      </button>
    );
  }

  // The layoutId is set ONLY on the interactive copy. The mobile stack is still mounted (it is
  // merely `lg:hidden`), so tagging both trees would put the SAME layoutId in the DOM twice,
  // framer-motion would pair the visible desktop image with the hidden mobile one, and the
  // detail panel would silently render blank. It did. Do not tag the non-interactive copy.
  // THE HERO LOADS EAGERLY, and in `fit` mode that is correctness, not tuning: an auto-sized
  // replaced element takes its size from its INTRINSIC dimensions, and an image that has not
  // arrived has none — it lays out at 0x0 and the region is empty until the bytes land. (Measured:
  // the default project's hero rendered 0x0.) The hero is also the one image guaranteed to be on
  // screen, so `lazy` was never right for it.
  const loading = fit ? 'eager' : 'lazy';
  // Width variants (generated) let a phone pull ~400-800px instead of the full 0.5-1.1MB plate. The
  // variants preserve aspect ratio, so the element still sizes from the same intrinsic ratio and the
  // crop/ratio probes stay valid. `sizes` is the gallery cell's real render width. A source with no
  // manifest entry (small image, or a PNG left un-varianted) yields undefined and keeps its plain src.
  const srcSet = srcSetFor(image.src);
  const sizes = srcSet ? SIZES.galleryPlate : undefined;
  const img = onOpen ? (
    <motion.img
      layoutId={`shot-${image.src}`}
      src={image.src}
      srcSet={srcSet}
      sizes={sizes}
      alt={image.alt}
      loading={loading}
      decoding="async"
      className={frame}
      data-licensed-crop={fillHero || undefined}
    />
  ) : (
    <img
      src={image.src}
      srcSet={srcSet}
      sizes={sizes}
      alt={image.alt}
      loading={loading}
      decoding="async"
      className={frame}
      data-licensed-crop={fillHero || undefined}
    />
  );

  if (!onOpen) return img;

  return (
    <button type="button" onClick={() => onOpen(image)} aria-label={`Enlarge: ${image.alt}`} className={btnClass}>
      {img}
      {/* The affordance stays invisible until you're on the image. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-inkBlack/0 transition-colors duration-300 group-hover:bg-inkBlack/[0.06] motion-reduce:transition-none"
      />
    </button>
  );
}

/**
 * The supporting images as a JUSTIFIED ROW (mobile): each cell's width is proportional to its image's
 * aspect ratio (`flexGrow: ratio`, `flexBasis: 0`) and the row's height comes from the SUM of those
 * ratios (`aspectRatio: sumRatio` across the full width). That makes every cell's shape match its
 * image's shape, so BOTH `object-cover` (photos) and `object-contain` (diagrams that must not crop)
 * fill their cell edge-to-edge — the old equal grid forced a contain image into a tall narrow cell and
 * left a white band above and below it (the Plentify bug). Free to take whatever height it needs,
 * because the mobile page scrolls.
 */
function SupportingRow({
  images,
  onOpen,
  reduced,
}: {
  images: ProjectImage[];
  onOpen?: (image: ProjectImage) => void;
  reduced?: boolean;
}) {
  if (images.length === 0) return null;
  const sumRatio = images.reduce((s, im) => s + im.ratio, 0);
  return (
    <div className="flex w-full shrink-0 items-stretch gap-2" style={{ aspectRatio: sumRatio > 0 ? sumRatio : undefined }}>
      {images.map((img, i) => (
        <Fragment key={img.src}>
          {/* A hairline sepia divider between supporting chips (Sai §5) — the timeline's chip language,
              echoed here so the gallery reads as mounted plates rather than a second, larger photo grid. */}
          {i > 0 && <span aria-hidden className="w-px flex-none self-stretch" style={{ background: `${INK_SEPIA}2a` }} />}
          <div className="relative min-h-0" style={{ flexGrow: img.ratio, flexBasis: 0 }}>
            <ProjectImg image={img} onOpen={onOpen} reduced={reduced} fill />
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/**
 * THE MEDIA AREA — ONE WALL (2026-07-17). Daniel, on the live page: "Some of our project images are
 * not filling their appropriate space (Archipedia, Synthetic Vision, LLO, Resia, DAC, Hydraulic,
 * Plentify, Origami, and Flowerfield). Again, all of these photos are like bricks, there must be an
 * equal line of mortar between them, and that must be very thin. There are too many spacings between.
 * Find a dynamic way to organize them."
 *
 * NINE OF TWELVE PROJECTS NAMED, which is the sentence that says this is the layout and not nine
 * assets. The packer is `about/pack.ts`; read its header for the algorithm and for what is provably
 * impossible. What is worth keeping HERE is the history, because each layout below was a correct
 * response to Daniel's last note and became the next note's complaint:
 *
 *   ROUND 3, an L-SHAPE. The hero, a right column, and a full-width bottom strip. It orphaned a lone
 *   thumbnail at the bottom-left of the hero at a fraction of its size. He overrode it.
 *
 *   ROUND 5, TWO REGIONS. He annotated a screenshot with two boxes: "Make the hero image of every
 *   project fit within square 1, and organize all the side images into square 2." So: hero ~66% alone,
 *   every support stacked in a ~31% rail. `dealSupporting` died with the L-shape, and its rule is
 *   still true and still worth knowing: DEAL BY SHAPE, NEVER BY POSITION. Dealing by array order put
 *   Archipedia's 0.46-ratio screenshot into the wide strip, where it came out 38px wide. A sliver.
 *
 *   ROUND 10, TONIGHT — the two regions are what he is complaining about, and the measurement says
 *   why. The hero's region was the `flex-1` REMAINDER after the rail, and the picture inside it sized
 *   itself with FIT_FRAME. So whenever a hero's ratio disagreed with the remainder's, the slack
 *   opened up as a column of paper BETWEEN the hero and the rail. Measured at 1440x900, the apparent
 *   mortar down that seam, project by project:
 *
 *       12, 12, 12, 172, 12, 169, 12, 12, 12, 12, 219, 12      (the markup said `gap-3`, i.e. 12)
 *
 *   Origami's mortar line was 219px. That is "too many spacings between", exactly, and it is why he
 *   could name it from across the room. Every project he named is one where a slack column or a slack
 *   band opened; the three he did not name are the three where the hero's ratio happened to agree
 *   with its remainder.
 *
 * THE SHAPE OF ALL THREE COMPLAINTS IS THE SAME, and it is CLAUDE.md's standing rule wearing a new
 * hat: a REGION whose shape is decided before the picture is known is a wrong-shaped box, and every
 * fix so far has been a better guess at that shape. The wall stops guessing — there is no region per
 * picture at all, only the arrangement that the pictures' own ratios imply.
 *
 * WHAT DOES NOT CHANGE, and must not: the media area is still ONE uniform box on every project, and
 * the divider below it is still pinned by the band (see ProjectInfoBand). The wall packs INSIDE that
 * box and cannot move it.
 */

/**
 * THE HERO'S FRAME — the element IS the picture, at the largest size its region allows.
 *
 * Daniel: "Make the hero image of every project fit WITHIN square 1", and the standing rule, "no
 * cropping, do not lose context."
 *
 * `fill` cannot do that, and the difference is not cosmetic. `fill` gives the picture a box of
 * someone else's shape and then resolves the disagreement with object-fit: `cover` CROPS and
 * `contain` LETTERBOXES. Every hero on this page is `cover`, so every hero was being cropped to a
 * box it never agreed with, and it got worse when the bottom strip came out — the region grew taller,
 * its ratio fell to 1.40 against a 1.78 hero, and Plentify lost 21% of its width off the sides.
 * Silently. That is precisely "losing context".
 *
 * A replaced element (img/video) sizes itself from its own intrinsic ratio, clamped by max-width and
 * max-height, so `max-h-full max-w-full` + auto sizing makes the element EXACTLY the picture, as
 * large as fits, cropped nowhere. object-fit then has nothing to resolve, because the box and the
 * image are the same shape. The slack is vellum, in one direction only, and it is the region's air
 * rather than a margin inside the frame.
 *
 * NOTE what this does NOT fix, because layout cannot: Daniel's "the hero floats with large white
 * margins left and right" on Plentify is the ASSET'S OWN BACKDROP. Measured: its 1920x1080 poster
 * has 451 fully-white columns on the left and 478 on the right — 48.4% of the picture is white
 * paper. Resia's hero is 34.6%. No box can remove white that is inside the image, and cropping it
 * out is the one thing the rule forbids doing silently. Flagged for Daniel; it wants a re-export.
 */
const FIT_FRAME = 'block h-auto w-auto max-h-full max-w-full object-contain';

/** The right column's own aspect: stacking images of full column width gives a total height of
 *  `width * sum(1/ratio)`, so the column that exactly holds them has this ratio. Feeding it as the
 *  container's `aspectRatio` alongside `h-full` lets the column DERIVE its width from the height it
 *  was given — which is what keeps every cell at its exact ratio without clipping. `max-w` then caps
 *  it at its 26% share; when that bites, the cells simply get shorter (still exact) and the column
 *  ends early rather than cropping anything. */
export function stackRatio(images: readonly { ratio: number }[]): number {
  const inv = images.reduce((s, im) => s + 1 / im.ratio, 0);
  return inv > 0 ? 1 / inv : 1;
}

/** The gap between the rail's cells, px. It is `gap-3` in the markup and a term in `railWidth` —
 *  those two must agree, which is why it is a constant and not a literal in a class string. */
export const RAIL_GAP = 12;

/**
 * THE RAIL'S WIDTH, from the height it actually has.
 *
 * Daniel: "every project seems to make the same mistake with the images overlapping and passing
 * their dedicated boundary." He was right, and it was every project with more than one supporting
 * image — measured, the rail ran 24px past its region on five of them (12px into the WHAT WE
 * LEARNED pill) and 84px past on Origami.
 *
 * THE BUG WAS THAT `stackRatio` FORGOT THE GAPS. It solves `W * sum(1/ratio) = H` — the cells fill
 * the height exactly — and then the flexbox adds `(n-1) * RAIL_GAP` of gap between them and pushes
 * the last cell straight out of the box. The overflow was exactly (n-1)*12 on every project, which
 * is how the cause identified itself: 2 images 12px, 3 images 24px, 8 images 84px.
 *
 * The gaps have to be in the arithmetic:
 *      W * sum(1/ratio) + (n-1) * gap = H      ->      W = (H - (n-1) * gap) / sum(1/ratio)
 *
 * WHICH IS WHY THIS TAKES A HEIGHT AND `aspectRatio` COULD NOT. An aspect ratio is a pure number; it
 * cannot subtract pixels from a height it is never told. That is the whole reason the rail is
 * measured now instead of declared — the constraint stopped being expressible as a ratio the moment
 * the gaps counted.
 */
export function railWidth(images: readonly { ratio: number }[], height: number, gap = RAIL_GAP): number {
  const inv = images.reduce((s, im) => s + 1 / im.ratio, 0);
  if (inv <= 0 || height <= 0) return 0;
  return Math.max(0, (height - Math.max(0, images.length - 1) * gap) / inv);
}

/**
 * Mobile: the hero at its OWN shape, then the rest as a justified row below.
 *
 * THE BANNED PATTERN WAS LIVE HERE, ON A HERO, AND IT WAS REPORTED THREE TIMES BEFORE ANYONE MEASURED
 * IT. This read `className="aspect-[3/2]"` and passed neither `fit` nor `fill`, which lands on
 * ProjectImg's default branch: `object-cover`, inside a hardcoded 3:2 box. That is precisely the
 * wrong-shape box the page's most-repeated bug is about — "STOP FORCING GEOMETRY ONTO SOMETHING THAT
 * ALREADY KNOWS ITS OWN SHAPE" — and it survived because every measurement of it was taken on desktop,
 * where this tree is `lg:hidden` and its rects are meaningless.
 *
 * MEASURED AT 390x844 BEFORE THE FIX: eight heroes cropped, 10.7% to 22.6% of the picture gone.
 * Robotic Factory lost 22.6% and Archipedia 18.1%. **The Plentify loss that got `object-fit: cover`
 * BANNED on heroes was 21%** — so the banned pattern was quietly costing MORE on mobile than the
 * incident that banned it, for rounds, on the same page that carries the law forbidding it.
 *
 * THE FIX IS THE LAW, NOT A BETTER RATIO: drop the box. With `w-full` and no height constraint the
 * <img> takes its own intrinsic ratio, the box becomes the picture's own shape, and `object-cover` has
 * nothing left to crop. Do not put an `aspect-[...]` back on this: any fixed ratio is wrong for
 * eleven of twelve projects, because they do not share one.
 *
 * The licensed crop deliberately does NOT reach here. It is gated on `fit`, which this does not pass,
 * and that is correct rather than an oversight: the licence exists to hold ONE uniform region on
 * desktop (see ProjectImage.fillHero). Mobile stacks, has no uniform region, and therefore has no
 * reason to spend 20% of a video to get one.
 */
function Gallery({
  project,
  onOpen,
  reduced = false,
}: {
  project: Project;
  onOpen?: (image: ProjectImage) => void;
  reduced?: boolean;
}) {
  const { hero, rest } = heroSplit(project.images);
  // MOUNTED-PLATE FRAME (Sai §5): a hairline sepia rule + a small paperVellum mat, so the mobile
  // gallery reads in the same "mounted specimen" register as the timeline plates and the founder
  // paintings — not a full-bleed photo dump escalating off the lighter timeline above it. These are
  // the work itself (tap-to-lightbox), so they are NOT miniaturized; the change is framing, not scale.
  // Inline rule colour because `INK_SEPIA` is a hex the SVG/border layers already share; `33`/`2a` are
  // low-opacity sepia so the frame reads as a quiet mount, never a hard box.
  const plate = 'bg-paperVellum p-1.5';
  const rule = { border: `1px solid ${INK_SEPIA}33` };
  return (
    <figure className="space-y-3">
      {/* `data-mobile-hero` is the handle qa/mobile-hero.mjs measures — it stays on the hero's frame so
          the guard still selects it. */}
      <div data-mobile-hero className={plate} style={rule}>
        <ProjectImg image={hero} onOpen={onOpen} reduced={reduced} />
      </div>
      {rest.length > 0 && (
        <div className={plate} style={rule}>
          <SupportingRow images={rest} onOpen={onOpen} reduced={reduced} />
        </div>
      )}
    </figure>
  );
}

/* ------------------------------- lightbox --------------------------------- */

/** The large view of a video tile: the same loop, at the same slowed rate, big. */
function LightboxVideo({ image }: { image: ProjectImage }) {
  const { ref, start } = useAutoplayVideo(image.video?.rate ?? 1);
  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      poster={image.src}
      aria-label={image.alt}
      onLoadedData={start}
      onCanPlay={start}
      onClick={(e) => e.stopPropagation()}
      className="relative max-h-[82vh] w-auto max-w-[min(1600px,94vw)] cursor-default border border-inkBlack/15 bg-white object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)]"
    >
      {image.video?.webm && <source src={image.video.webm} type="video/webm" />}
      <source src={image.video?.mp4} type="video/mp4" />
    </video>
  );
}

/** A chevron button for stepping the lightbox with the mouse (arrow keys work too). */
function LightboxChevron({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Previous image' : 'Next image'}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-inkBlack/20 bg-paperVellum/70 font-serifDisplay text-[20px] leading-none text-inkBlack/55 transition-colors hover:bg-paperVellum/95 hover:text-inkBlack focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inkBlack ${
        side === 'left' ? 'left-4 md:left-6' : 'right-4 md:right-6'
      }`}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
  );
}

/**
 * Lightbox — click any project image and it opens large.
 *
 * The motion is a SHARED ELEMENT: the tile you clicked carries `layoutId`, and the large image
 * claims the same one, so framer-motion morphs the actual thumbnail up to full size. The caption
 * lives HERE and only here: the real caption in serif, a counter, and visible prev/next chevrons
 * for the mouse. There is no "Fig." prefix — Daniel: no figure text on the photos.
 *
 * Close: Escape, the backdrop, or the button. Arrow keys / chevrons walk the project's other shots.
 */
export function Lightbox({
  images,
  index,
  onClose,
  onStep,
  reduced,
  morph = true,
}: {
  images: ProjectImage[];
  index: number | null;
  onClose: () => void;
  onStep: (delta: number) => void;
  reduced: boolean;
  /** Shared-element morph from the clicked tile. ON for the gallery (its tiles carry the matching
   *  `shot-${src}` layoutId). OFF for the mobile timeline: its plates carry no layoutId, and some
   *  timeline srcs also appear as gallery tiles — a shared layoutId across two live elements is the
   *  documented deadlock (CLAUDE.md). With morph off the viewer just fades in; no collision. */
  morph?: boolean;
}) {
  const open = index !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onStep(1);
      if (e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    // The page behind must not scroll while the viewer owns the screen.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, onStep]);

  const image = index === null ? null : images[index];
  const many = images.length > 1;

  return (
    <AnimatePresence>
      {image && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={image.alt}
          className="fixed inset-0 z-[60] flex cursor-zoom-out flex-col items-center justify-center p-4 md:p-10"
          onClick={onClose}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* The paper ground dims rather than blacks out — this is a study, not a cinema. */}
          <div aria-hidden className="absolute inset-0 bg-paperVellum/92 backdrop-blur-sm" />

          {many && <LightboxChevron side="left" onClick={() => onStep(-1)} />}
          {many && <LightboxChevron side="right" onClick={() => onStep(1)} />}

          {image.video && !reduced ? (
            <LightboxVideo image={image} />
          ) : (
            <motion.img
              layoutId={reduced || image.video || !morph ? undefined : `shot-${image.src}`}
              src={image.src}
              alt={image.alt}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[82vh] w-auto max-w-[min(1600px,94vw)] cursor-default border border-inkBlack/15 bg-white object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)]"
              transition={{ duration: reduced ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
            />
          )}

          {/* The caption is CENTRED under the image, with the counter and close beneath it. */}
          <motion.div
            className="relative mt-5 flex w-full max-w-[min(1600px,94vw)] flex-col items-center gap-2"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="max-w-[70ch] text-center font-serifDisplay text-[14px] leading-snug text-inkBlack/70">
              {image.caption ?? image.alt}
            </p>
            <div className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/45">
              {many && (
                <span className="tabular-nums">
                  {index! + 1} / {images.length}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="transition-colors hover:text-inkBlack focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inkBlack"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A small down-arrow-into-tray glyph for the paper-download affordance. */
function DownloadGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 2v8m0 0 3-3m-3 3L5 7" />
      <path d="M2.5 12.5v1h11v-1" />
    </svg>
  );
}

/** The awards / publications block, with the paper download. Omitted entirely when a project has
 *  neither, so no empty label ever shows. Olive stays reserved for the one lesson pill, so it isn't
 *  diluted by a second use here. */
function Recognition({ project, className = '' }: { project: Project; className?: string }) {
  const { paper, awards } = project;
  if (!(awards && awards.length > 0) && !paper) return null;
  return (
    <div className={className}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">
        Awards and publications
      </p>
      {awards && awards.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {awards.map((award) => (
            <li key={award} className="font-serifDisplay text-[14px] leading-snug text-inkBlack/75">
              {award}
            </li>
          ))}
        </ul>
      )}
      {paper?.title && (
        <p className="mt-1.5 font-serifDisplay text-[14px] italic leading-snug text-inkBlack/75">
          {paper.title}
        </p>
      )}
      {paper && (
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/55">
          {paper.venue} · {paper.authors}
        </p>
      )}
      {paper?.pdf && (
        <a
          href={paper.pdf}
          download
          className="group mt-3 inline-flex items-center gap-2.5 border border-inkBlack/25 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-inkBlack transition-colors hover:border-accentOlive hover:text-accentOlive focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inkBlack [@media(pointer:coarse)]:min-h-[44px]"
        >
          <DownloadGlyph />
          Read the paper
          <span className="text-inkBlack/40 group-hover:text-accentOlive/70">{paper.pdfSize}</span>
        </a>
      )}
    </div>
  );
}

/** The lesson, as a filled/bordered pill. No divider rule — the chip itself sets it apart. */
function LessonPill({ project }: { project: Project }) {
  return (
    <div className="inline-flex max-w-full flex-col gap-1 rounded-2xl border border-accentOlive/35 bg-accentOlive/[0.07] px-4 py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accentOlive">
        What we learned
      </span>
      <span className="font-serifDisplay text-[clamp(1rem,1.2vw,1.2rem)] leading-snug text-inkBlack">
        {project.learned}
      </span>
    </div>
  );
}

/**
 * THE PROJECT INFORMATION BAND — the bottom row of the desktop detail (2026-07-16, round 2).
 *
 * Daniel: "What if we switch them to rows instead where the main images of the projects show up at
 * the top... and have the project information at the bottom". So the information reads ACROSS, under
 * the picture rather than beside it: (1) title · credit · description, (2) awards and publications ·
 * collaborators, (3) the lesson.
 *
 * THE COLUMN SPLIT IS A HEIGHT BUDGET, NOT A STYLE CHOICE, and it is counter-intuitive enough to be
 * worth stating: a grid row is as tall as its TALLEST column, and this band's height comes straight
 * out of the hero above it. So the split has to BALANCE the stacks, and there are two ways to get it
 * wrong, both of which shipped in this file today before this comment did:
 *   - Stacking description AND recognition in one column (3 cols) made that column 319px on Synthetic
 *     Vision and squeezed the hero to 254px at 875 wide — a 3.4:1 letterbox. The same "wrong aspect"
 *     complaint that this whole rework is fixing, arriving from the other direction.
 *   - Splitting them apart into FOUR columns made it WORSE, not better (465px on Robots as
 *     Instruments): narrower columns wrap more, so every column grows taller at once. More columns
 *     does not mean a shorter band.
 * What works is three columns with the description paired with the SHORT thing (the title) and the
 * recognition list paired with the other short thing (collaborators): two stacks of ~195 and ~180
 * instead of one of 319. The measure lands near 40ch, which is a real reading measure.
 *
 * The band is NOT capped and NOT scrollable. An earlier cut put `maxHeight` + `overflow-y-auto` here
 * to protect the hero's height, and it silently hid the bottom of seven projects' awards and
 * collaborators (up to 61px of it) behind a scrollbar nobody would find in a band this short. The
 * band takes the height it needs; the hero absorbs the difference down to its floor.
 *
 * ---
 *
 * THE DIVIDER NEVER MOVES (round 10, item 7), AND THE BAND IS WHAT MOVES IT. Daniel: the line must
 * sit at the same place on every project, only images above it, only text below.
 *
 * THE BRIEF'S PREMISE WAS INVERTED, and the measurement is what settled it. The media region does not
 * push the divider down — the media region is the REMAINDER (`flex-1`), the band is `shrink-0`, and
 * so `dividerY = detail.bottom − band.height`. The frame itself never moved: measured at 1440x900,
 * `detailTop`/`detailBot` are identical on all twelve. The band was the only variable, and every
 * divider position was an exact multiple of 20.6px — one line of `text-[15px] leading-snug`. The
 * divider's y was literally "how many lines the tallest column wraps to". So no hero change could
 * ever have fixed this, and cropping heroes to chase it would have been the fake fix the brief warns
 * about.
 *
 * ARCHIPEDIA IS NOT THE MAX — it is 4th of 7 distinct values, which is the trap. Pinning the band at
 * Archipedia's 228.4 would have cut 73.8px of real text off Hydraulic Commons and 71.1px off Robots,
 * and capping with a scrollbar is the thing already tried and reverted (above). Put to Daniel with
 * those numbers, he ruled: PIN AT THE LONGEST, LOSE NO TEXT, and accepted explicitly that Archipedia's
 * own line rises ~74px from where he had called it correct.
 *
 * HOW IT IS PINNED, AND WHY NOT `min-h-[302px]`: 302.1 is a MEASUREMENT AT ONE VIEWPORT. The detail
 * column's width changes with the window, text re-wraps, and the tallest band stops being 302 —
 * so a hardcoded floor would pin the divider at 1440x900 and let it drift everywhere else, which is
 * this page's most-repeated bug ("the fix is never a better number") wearing a ruling as cover.
 * Instead EVERY project's band is rendered into the SAME grid cell, and the inactive ones are
 * `invisible`. A grid row is as tall as its tallest child, so the row IS the longest band, measured
 * by the browser, at whatever width it currently is. No constant to go stale.
 *
 * `visibility: hidden` rather than `display: none` or unmounting, and the distinction is the whole
 * trick: a `hidden` element still occupies its grid cell (which is what holds the height) while being
 * removed from the accessibility tree AND the tab order, so the twelve shadow bands cannot be read
 * out, focused, or reached by a screen reader. `display:none` would collapse the cell and pin
 * nothing; `aria-hidden` alone would leave their links tabbable.
 */
function ProjectInfoBand({ project, shadow = false }: { project: Project; shadow?: boolean }) {
  return (
    <div
      data-project-band={shadow ? 'shadow' : 'active'}
      aria-hidden={shadow || undefined}
      className={`col-start-1 row-start-1 grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-7 border-t border-inkBlack/12 pt-4 ${
        shadow ? 'invisible' : ''
      }`}
    >
      <div>
        <h3 className="font-serifDisplay text-[26px] leading-tight text-inkBlack">{project.title}</h3>
        <Meta project={project} className="mt-1.5 block" />
        <p className="mt-3 font-serifDisplay text-[15px] leading-snug text-inkBlack/75">{project.description}</p>
      </div>
      <div>
        <Recognition project={project} />
        {project.collaborators && (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">Collaborators</p>
            <p className="mt-1.5 font-serifDisplay text-[13px] leading-snug text-inkBlack/75">
              {project.collaborators}
            </p>
          </div>
        )}
      </div>
      <div>
        <LessonPill project={project} />
      </div>
    </div>
  );
}

/**
 * The MOBILE project text: the same material in one column, in reading order — title + credit,
 * description, awards and publications, collaborators, then the lesson.
 */
function ProjectText({ project }: { project: Project }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serifDisplay text-[24px] leading-tight text-inkBlack">{project.title}</h3>
        <Meta project={project} className="shrink-0" />
      </div>
      <p className="mt-3 font-serifDisplay text-[15px] leading-snug text-inkBlack/75">
        {project.description}
      </p>
      <Recognition project={project} className="mt-5" />
      {project.collaborators && (
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">Collaborators</p>
          <p className="mt-1.5 font-serifDisplay text-[14px] leading-snug text-inkBlack/75">
            {project.collaborators}
          </p>
        </div>
      )}
      <div className="mt-6">
        <LessonPill project={project} />
      </div>
    </div>
  );
}

/* ------------------------------- LIST view -------------------------------- */

function ListView({ reduced }: { reduced: boolean }) {
  // REVERSE CHRONOLOGICAL: the most recent work leads. `n` encodes that order (01 = newest),
  // so sorting by it and sorting by year agree — the number the reader sees is the position.
  //
  // THE INDEX IS FLAT (2026-07-16, round 2). It used to be grouped by discipline, each group led by a
  // mono ARCHITECTURE / PRODUCT DESIGN / SOFTWARE heading and a 44px painted frontispiece. Daniel:
  // "Get rid of the small logo and extra product design software architecture." Both went. At 44px the
  // frontispieces read as beige smudges rather than paintings, and the headings chopped one twelve-item
  // reverse-chronological list into three short ones that each restarted the clock. `groupProjects` was
  // display machinery for those headings and is deleted with them; each project still carries its
  // `discipline`, which is simply no longer drawn.
  const items = [...PROJECTS].sort((a, b) => a.n.localeCompare(b.n));
  // Active selection is tracked by project `n`, defaulting to the top of the menu.
  const [activeN, setActiveN] = useState(() => items[0].n);
  const project = items.find((p) => p.n === activeN) ?? items[0];
  const { hero, rest } = heroSplit(project.images);


  // THE MEDIA REGION, measured — BOTH dimensions now. The pack solves an arrangement against a real
  // W x H (see pack.ts); the region is the `flex-1` remainder of a viewport-locked panel, so nothing
  // static knows either number. The old rail only needed the height and took its width from a
  // percentage; the pack needs the box.
  const mediaRowRef = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState({ w: 0, h: 0 });
  // RE-BOUND ON EVERY PROJECT, because the row lives inside a `key={project.n}` subtree that
  // REMOUNTS on each switch. With `[]` deps the observer keeps watching the detached old element
  // and the size freezes at whatever the first project measured — or at 0.
  useEffect(() => {
    const el = mediaRowRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      // Only ever widen from a real reading. A 0 here is the element between mounts, not a region
      // that has collapsed, and writing it back would unpack the wall for a frame.
      if (r.width > 0 && r.height > 0)
        setRegion((prev) => (Math.abs(prev.w - r.width) < 0.5 && Math.abs(prev.h - r.height) < 0.5 ? prev : { w: r.width, h: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [project.n]);

  /**
   * THE WALL. Daniel, 2026-07-17: "all of these photos are like bricks, there must be an equal line of
   * mortar between them, and that must be very thin. There are too many spacings between. Find a
   * dynamic way to organize them."
   *
   * `packWall` searches every arrangement of THIS project's pictures against the region it actually
   * has and picks the one that leaves the least paper, with every box built to its picture's authored
   * ratio. The whole argument is in pack.ts; the two things that matter at this call site:
   *
   *   - THE HERO IS `items[0]`, so the pack knows which brick has to stay the biggest. Same split the
   *     page has always used (`heroSplit`), same reading order after it — the pack is NOT allowed to
   *     reorder the supports, because the captions tell a story in sequence.
   *
   *   - `fillHero` IS NOT PASSED, AND THE WALL REFUNDS THE CROP. Daniel licensed a 20.1% crop on
   *     Robots' KUKA video because the alternative was a bespoke region height, and he had ruled
   *     "prioritize that every project occupies the same formatting". The pack dissolves that
   *     dilemma: the video's cell is built at exactly 1.7778, so it is uncropped AND the region is
   *     still uniform — what varies is the arrangement inside it, which was always varying anyway
   *     (the old heroes ran 511px to 744px wide across the twelve). The cost is 71px of paper at the
   *     wall's bottom edge on that one project. The flag STAYS in projects.ts: it is Daniel's ruling
   *     on the record, it costs nothing inert, and if the layout ever needs it again the licence is
   *     still there. RAISED FOR HIM — uncropped video with air beneath it, or the crop back.
   */
  const wallItems = useMemo(() => [hero, ...rest], [hero, rest]);
  const wall = useMemo(() => packWall(wallItems, region.w, region.h), [wallItems, region.w, region.h]);

  const lightboxImages = project.images.filter((im) => !im.pending);
  const [shot, setShot] = useState<number | null>(null);
  const closeShot = useCallback(() => setShot(null), []);
  const stepShot = useCallback(
    (delta: number) =>
      setShot((i) =>
        i === null || lightboxImages.length === 0
          ? i
          : (i + delta + lightboxImages.length) % lightboxImages.length,
      ),
    [lightboxImages.length],
  );
  const openShot = useCallback(
    (image: ProjectImage) => setShot(lightboxImages.findIndex((im) => im.src === image.src)),
    [lightboxImages],
  );
  // Changing project while a shot is open would strand the index in the wrong set.
  useEffect(() => setShot(null), [project.n]);

  return (
    <div className="min-h-0 flex-1">
      {/* Desktop master-detail: the SELECTION MENU hard left, and the selected project's ROWS on the
          right. The detail is FIXED to the frame height. */}
      <div className="hidden h-full min-h-0 gap-x-16 gap-y-8 lg:grid lg:grid-cols-[minmax(300px,0.8fr)_2.2fr] xl:gap-x-20">
        {/* The project menu: one FLAT reverse-chronological list of all twelve. Hover/focus selects;
            the tint bar rides the active row's left edge. `overflow-y-auto` is only a last-resort
            safety for unusually short viewports — the list fits at normal desktop heights. */}
        <nav className="min-h-0 min-w-0 self-stretch overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ol>
            {items.map((p) => {
              const on = p.n === activeN;
              // `tint` is the STRUCTURE colour (the bar + the row's ground); `ink` is the same
              // colour at reading weight for the glyphs that sit ON that tinted ground.
              const tint = authorColor(p.by);
              const ink = authorTextColor(p.by);
              return (
                <li key={p.n} className="border-t border-inkBlack/10 last:border-b">
                  <button
                    type="button"
                    onMouseEnter={() => setActiveN(p.n)}
                    onFocus={() => setActiveN(p.n)}
                    onClick={() => setActiveN(p.n)}
                    aria-label={`${p.title}, ${AUTHOR_LABEL[p.by]}, ${p.year}`}
                    aria-current={on}
                    className="group relative flex w-full items-baseline gap-3 py-2 pl-4 pr-1 text-left transition-colors duration-200"
                    style={on ? { backgroundColor: `${tint}14` } : undefined}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-[3px] origin-center transition-transform duration-200 ease-out motion-reduce:transition-none"
                      style={{ background: tint, transform: `scaleY(${on ? 1 : 0})` }}
                    />
                    {/* Bigger than it was (Daniel: "project titles slightly bigger"). The three
                        discipline headings are gone, which is exactly the room this spends. */}
                    <span
                      className={`font-serifDisplay text-[clamp(1rem,1.45vw,1.3rem)] leading-tight tracking-[-0.01em] text-inkBlack transition-transform duration-300 ease-out motion-reduce:transition-none ${
                        on && !reduced ? 'translate-x-1' : ''
                      }`}
                      style={on ? { color: ink } : undefined}
                    >
                      {p.title}
                    </span>
                    <span
                      className="ml-auto shrink-0 font-mono text-[10px] tracking-[0.14em] text-inkBlack/40 transition-colors"
                      style={on ? { color: ink } : undefined}
                    >
                      {p.year}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* THE DETAIL, AS ROWS (2026-07-16, round 2). Daniel: "a lot of these images are not looking
            good because they're natively landscape but they're being displayed in portrait mode."
            They were: the hero used to sit in the left COLUMN of a [1.55fr_1fr] split beside the text,
            which at 1440 made its box ~505x557 — PORTRAIT — so a landscape hero floated in it with dead
            paper above and below.
            Now the picture takes the full width of the detail and the information reads across
            underneath it. Nothing here fixes an aspect ratio: the hero's box is simply the full width
            by whatever height the band leaves it (~860x450 at 1440 — landscape), so a landscape image
            fills it edge to edge and a `contain` diagram letterboxes in the correct direction. */}
        <div className="min-h-0 overflow-hidden">
          {/* NO AnimatePresence here, and that is deliberate. `mode="wait"` deadlocks against the
              `layoutId` images inside this subtree: framer-motion holds the exiting panel open
              waiting on a shared-layout transition that never resolves, so the exit never
              completes, the incoming panel never mounts, and the detail FREEZES on whichever
              project rendered first while the list happily highlights another. (That is the bug
              this page shipped with once.) Keying a plain motion.div remounts it on every change
              and fades the new one in — same read, no exit to get stuck on. */}
          <motion.div
            key={project.n}
            data-project-detail
            className="flex h-full min-h-0 flex-col gap-3"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduced ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* ROW 1 — THE WALL. See the MEDIA comment above, and pack.ts for the packer. */}
            <div ref={mediaRowRef} className="relative min-h-0 flex-1">
              {/* THE CELLS ARE ABSOLUTE, AND THAT IS LOad-BEARING FOR THE DIVIDER. The media row is the
                  `flex-1` REMAINDER of a viewport-locked panel and the band below it is `shrink-0`, so
                  `dividerY = detail.bottom − band.height` and the row's height must depend on NOTHING
                  the wall does. Absolute children have no intrinsic contribution, so there is no path
                  from a pack decision back to the row's height, and therefore none to the divider.
                  A flow-laid wall would close that loop — the wall would size the row, the row would
                  size the wall — and the divider pin would start drifting per project. Verified with
                  qa/divider.mjs at four widths.

                  It also means the wall is measured, never declared: `mediaRowH`/`mediaRowW` come from
                  a ResizeObserver, and before the first measurement `packWall` returns null and this
                  renders nothing. That is deliberate. The old rail rendered `width: railWidth(rest, 0)`
                  = 0 on the first paint, i.e. a row of zero-width images. */}
              {wall && (
                <div data-project-wall className="absolute left-0 top-0" style={{ width: wall.w, height: wall.h }}>
                  {wall.cells.map((c) => (
                    <div
                      key={c.item.src}
                      /* `data-project-hero` stays on the hero's CELL: it is the handle every probe
                         selects (qa/hero-clip.mjs, qa/project-media.mjs), and a guard cannot check
                         what it cannot select. `data-wall-cell` is new, because the wall's promise is
                         about EVERY picture now, not only the hero — the rail was the only thing that
                         was ever a separate species and it no longer exists. */
                      data-wall-cell
                      data-project-hero={c.item === hero ? '' : undefined}
                      className="absolute"
                      style={{ left: c.x, top: c.y, width: c.w, height: c.h }}
                    >
                      <ProjectImg image={c.item} onOpen={openShot} reduced={reduced} brick />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* ROW 2 — the project information, AND THE DIVIDER THAT NEVER MOVES.
                Every project's band is stacked into one grid cell so the row is always as tall as the
                LONGEST band, measured by the browser at whatever width the window currently is. Only
                the active one is visible; the rest hold the height and nothing else. That is Daniel's
                ruling ("pin at the longest, lose no text") expressed as geometry rather than as a
                number that would go stale the moment the window resized. See ProjectInfoBand. */}
            <div className="grid shrink-0">
              {items.map((p) => (
                <ProjectInfoBand key={p.n} project={p} shadow={p.n !== project.n} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile: the same projects stacked, each with its images + text inline. */}
      <div className="space-y-16 lg:hidden">
        {items.map((p) => (
          <section key={p.n} aria-label={`${p.title}, ${AUTHOR_LABEL[p.by]}, ${p.year}`}>
            <div className="mb-3 flex items-center gap-3">
              <span aria-hidden className="h-[3px] w-6 rounded-full" style={{ background: authorColor(p.by) }} />
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-inkBlack/40">{p.year}</span>
            </div>
            <Gallery project={p} reduced={reduced} />
            <div className="mt-5">
              <ProjectText project={p} />
            </div>
          </section>
        ))}
      </div>

      <Lightbox images={lightboxImages} index={shot} onClose={closeShot} onStep={stepShot} reduced={reduced} />
    </div>
  );
}

/* -------------------------------- founders -------------------------------- */

/*
 * THE LEADER LINES ARE GONE (2026-07-16, round 2). `FounderRoots` / `FounderRootStem` /
 * `FoundersFlow` / `FoundersFlowStem` drew hand-authored bezier "roots" wrapping the founder
 * columns and a plumb line running on down to the work. Daniel, on the sketch they came from:
 * "When I had initially sketched out those lines to go around us, I just wanted you to create a
 * level of flower ornamentation around the text... Right now it is extremely choppy because it is
 * just random lines on top of it." The lines were a PLACEHOLDER for flowers, and they were read as
 * a literal spec. `FounderBower` below is what they were standing in for.
 *
 * Recover them from git if ever needed: `git show fa87d33 -- src/pages/AboutPage.tsx`.
 */

/**
 * THE CODA — the timeline's floral ending (2026-07-16, round 3). Daniel: "On the bottom part, the
 * cross paths and 'the obsession is real and it is old' — I really like some of the flowers that
 * Clay had in the background in his version and the big spacing in between... I want you to bring
 * back the flowers and the beautiful ornamentation as the ending of the timeline, and at the bottom
 * to have all the projects."
 *
 * Clay's `Colophon()` (`git show about-v2-nonflowers:src/pages/scroll/ScrollPage.tsx`) is the source
 * of the look: a painting, then the payoff label, then the payoff in large italic, all centred with
 * a lot of air. Two things do not port:
 *   - His `PAINTINGS.eden` commission was deleted with the drafts, so the painting here is a GARLAND
 *     (vines arcing across a band) rather than a single mounted plant — which is also the right
 *     register: this is the end of a timeline that has been growing the whole way down, not a new
 *     specimen introduced at the last moment.
 *   - He overlaid the BowerMark on the painting at `bottom-[5%]`. That is the one thing CLAUDE.md
 *     forbids outright: `matRect` base-anchors every plant so its densest region sits on the mat's
 *     bottom pixel row, so a mark at the frame's base collides by construction, for every seed. No
 *     mark here.
 */
const CODA_BAND = { w: 1000, h: 300 };

/**
 * Four arcs across the band, composed by eye — the same "it just has to look pretty" register as the
 * founder bower. They sweep in from both edges and meet near the centre, so the band reads as a bower
 * closing over the line the timeline has been drawing all the way down.
 *
 * SAMPLED SMOOTH, not authored as corners. The first cut was five hand-placed points per vine and it
 * painted a hard grey ZIGZAG: the composer resamples a path at 4px and interpolates it LINEARLY, so
 * every authored point is a corner it drives straight through, and a vine with five points is five
 * corners. The founder bower gets away with ten gentle points; a wide arc cannot. So each vine here
 * is sampled off a smooth curve at ~1 point per 12px — the shape is still chosen by eye (the sweep,
 * the sag, where it meets), the SMOOTHNESS is just not left to luck.
 */
function codaArc(
  x0: number,
  x1: number,
  y0: number,
  sag: number,
  wobble: number,
  phase: number,
): Array<[number, number]> {
  const n = Math.max(8, Math.round(Math.abs(x1 - x0) / 12));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    // a single smooth swag, plus one slow undulation along it
    const y = y0 + sag * Math.sin(Math.PI * t) + wobble * Math.sin(Math.PI * (t * 2 + phase));
    return [x, y] as [number, number];
  });
}

const CODA_VINES: Array<Array<[number, number]>> = [
  codaArc(-40, 520, 74, 46, 12, 0.15), // in from the left, swagging low, meeting near centre
  codaArc(1040, 480, 66, 52, 10, 0.6), // its answer from the right, a touch higher
  codaArc(-30, 470, 232, -38, 9, 0.35), // a lower pair, arcing the other way
  codaArc(1030, 540, 244, -44, 11, 0.8),
];

/** Where the organs sit along each coda vine. ONE list, read by the painter that stamps them and by
 *  the reveal that uncovers them. */
const CODA_STATIONS = [0.12, 0.28, 0.44, 0.6, 0.76, 0.9] as const;
const CODA_ORGANS = ['leaf', 'bloom', 'leaf', 'bloom', 'bud', 'leaf'] as const;
/** The mask stroke that uncovers a painted vine's STEM. Wide enough to clear the composer's tube
 *  (rootWidth 3, tapering) and its shading, narrow enough that it does not drag the organs in with
 *  it — those have their own discs, a beat later. */
const CODA_STEM_MASK_W = 14;
/** The organ discs' radius, in BAND units. Smaller than the timeline's 85 because this band is only
 *  300 tall and the organs are painted at scale 1.5; 85 would uncover half the band per station. */
const CODA_ORGAN_R = 58;

function CodaBower({ reduced }: { reduced: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // The frame scale is read BEFORE the card line because the line is now placed against the span,
  // and the span is measured off the timeline's frame. See cardLineAt.
  const codaFrameScale = useTimelineFrameScale();
  const pageLine = usePageCardLine(reduced, revealSpanPx(codaFrameScale));
  // The band's own page position and scale, measured: the card line is a PAGE coordinate and the
  // drawing is in BAND units, which are 1:1 only while the band is not scaled down.
  const [box, setBox] = useState({ top: 0, scale: 1 });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0) return;
      setBox({ top: r.top + window.scrollY, scale: r.width / CODA_BAND.w });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [url]);
  const bandTop = box.top;
  const bandScale = box.scale || 1;
  // The timeline's px-per-world-unit, so this band's reveal spans the same distance ON SCREEN.
  // Read once at the top of the component (the card line needs it too) and aliased here.
  const frameScale = codaFrameScale;
  useEffect(() => {
    let live = true;
    requestGarland({
      // The coda grows the page's plant too. It used to pin `bower/spine-2/coda` — a suffix, so a
      // THIRD species — while the page's comments claimed it grew one plant. See about/species.ts.
      seed: PAGE_SPECIES,
      voice: 'pigment',
      width: CODA_BAND.w,
      height: CODA_BAND.h,
      vines: CODA_VINES.map((path) => ({
        path,
        stations: CODA_STATIONS.map((t, i) => ({ t, organ: CODA_ORGANS[i] })),
      })),
      scale: 1.5,
      rootWidth: 3,
      tube: true,
    })
      .then((painted) => {
        if (live) setUrl(painted);
      })
      .catch((err: unknown) => {
        console.error('gongbi coda bower failed:', err);
      });
    // NOTHING TO REVOKE. The object URL belongs to the painter's session cache and is shared by
    // every caller of this garland — revoking it here would hand the next mount a dead URL and the
    // ornament would silently vanish. See requestGarland.
    return () => {
      live = false;
    };
  }, []);
  if (!url) return null;

  /*
   * THE SAME MOTION AS THE TIMELINE, on a painted vine.
   *
   * Daniel: "Make sure that all flowers on site, the founder ones and the ones below, appear in the
   * same motion as the timeline ones."
   *
   * The timeline draws its stems as SVG paths, so it dashes them directly. These stems are PAINTED
   * — `tube: true`, the composer's own brush, which is the whole reason the coda looks like this and
   * is not up for negotiation. So the stem is revealed by dashing a MASK stroke laid along the vine's
   * own polyline instead of dashing the stem itself. Same expression, same span, same ramp; the only
   * difference is which layer the dash lives on. The organs then get the timeline's exact disc rule,
   * a beat behind their own vine's draw.
   *
   * THE VINES ARE KEYED TO THEIR ROOT, NOT THEIR Y — and here that is the point rather than a
   * detail. These are horizontal swags: every point of a vine is at nearly the same height, so a
   * y-driven reveal would uncover the whole thing in one frame. It would pop, which is exactly what
   * Daniel is objecting to. Root-keying is what the timeline's own branches do, and it means each
   * vine draws root → tip along its length as the line passes it — a stem growing sideways. (The
   * founders' arms are the opposite case: 650px tall and monotone in y, so they read per-run. Same
   * rule, applied where each shape actually lives.)
   *
   * Everything is in BAND units, and the whole drawing scales together because the <image> and the
   * mask share one viewBox — so this stays correct when the band is scaled down on a narrower page.
   */
  const localLine = (pageLine - bandTop) / bandScale;
  const spanBand = revealSpanPx(frameScale) / bandScale;

  return (
    <svg
      ref={svgRef}
      aria-hidden
      viewBox={`0 0 ${CODA_BAND.w} ${CODA_BAND.h}`}
      className="pointer-events-none mx-auto block w-full max-w-[1000px]"
    >
      <defs>
        {/*
         * THE FLOWERS' BLUR IS THIS GRADIENT, AND IT IS PERMANENT — not the 900ms timer, not a
         * filter, not DPR (2026-07-17). Read this before touching the stops.
         *
         * Mask alpha is LUMINANCE, so `offset 0.45 -> #fff, offset 1 -> #000` means the disc is fully
         * opaque only inside r = 0.45 * ORGAN_DISC_R = 38.25, and ramps to nothing by 85. The painted
         * organs are much bigger than 38.25. MEASURED AT STEADY STATE — camera settled, all organs at
         * opacity 1, no stems growing, the reveal entirely over: mean applied mask alpha on flower
         * pixels 0.65-0.68, only 36-43% of flower pixels fully opaque. TWO THIRDS OF EVERY FLOWER ON
         * THIS PAGE HAS BEEN RENDERING SEMI-TRANSPARENT, FOREVER.
         *
         * TWO BUGS, TWO STOPS, AND BOTH HALVES ARE NEEDED — they fix different mechanisms:
         *   - `0.45 -> 0.9` on the white stop: the core is opaque out to where the organ actually is,
         *     so the feather is a rim rather than a wash across the whole flower.
         *   - `stopOpacity=0` on the black stop: the rim was OPAQUE black, and mask children composite
         *     source-over, so a later disc's black rim PAINTED OVER an earlier disc's revealed core.
         *     Neighbouring organs were erasing each other.
         * A/B measured within ONE load (PAGE_SPECIES rolls per load, so across loads you measure the
         * species, not the fix): as shipped 0.684 mean / 42.9% opaque; rim only 0.861 / 43.5%; core
         * only 0.926 / 84.8%; BOTH 0.974 / 85.7%.
         *
         * WHAT THIS SAYS ABOUT ROUND 6, and it is the useful part: `organAt` genuinely was keyed to a
         * growth that saturates at 1 while asking for t + LAG + FADE, so 87 of 218 organs could never
         * reach full opacity. That fix was CORRECT AND INCOMPLETE. The schedule is right — every organ
         * does reach opacity 1 — and the residue is the disc's GEOMETRY, which no scheduling change
         * could ever have reached. Daniel has therefore still never seen these flowers render
         * properly. "Correct and incomplete" is the expensive kind, because the first fix makes the
         * symptom look like taste rather than a bug.
         *
         * THREE COPIES OF THIS EXIST AND THEY ARE IDENTICAL — `#coda-organ-disc` here,
         * `#paren-organ-disc` below, and `#sub-organ-disc` in CrossPathsTimeline.tsx. That is why
         * Daniel said "our flowers" and not "the timeline's flowers". Fix one, fix all three.
         */}
        <radialGradient id="coda-organ-disc">
          <stop offset="0.9" stopColor="#fff" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <mask id="coda-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={CODA_BAND.w} height={CODA_BAND.h}>
          {CODA_VINES.map((path, i) => {
            const pts = path.map(([x, y]) => ({ x, y }));
            const grow = reduced ? 1 : growAt(localLine, pts[0].y, spanBand);
            if (grow <= 0.001) return null;
            return (
              <g key={i}>
                {/* the stem, drawing root → tip. `stemDrawAt`, not the raw growth: the stem is inked
                    by STEM_SHARE of the progress so the tip organs have the rest to open in. See
                    reveal.ts — the coda carries the same organ ramp as the timeline and had the same
                    permanently-half-open bug. */}
                <path
                  d={polyD(pts)}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={CODA_STEM_MASK_W}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  {...dashProps(polyLen(pts), stemDrawAt(grow))}
                />
                {/* the organs, each a beat behind the stretch of stem carrying it */}
                {CODA_STATIONS.map((t, j) => {
                  const o = reduced ? 1 : organAt(grow, t);
                  if (o <= 0.001) return null;
                  const k = Math.max(1, Math.min(pts.length - 1, Math.round(t * (pts.length - 1))));
                  return (
                    <circle
                      key={j}
                      cx={pts[k].x}
                      cy={pts[k].y}
                      r={CODA_ORGAN_R}
                      fill="url(#coda-organ-disc)"
                      opacity={o}
                    />
                  );
                })}
              </g>
            );
          })}
        </mask>
      </defs>
      <image
        href={url}
        x={0}
        y={0}
        width={CODA_BAND.w}
        height={CODA_BAND.h}
        mask={reduced ? undefined : 'url(#coda-mask)'}
      />
    </svg>
  );
}

/**
 * The coda: the flowers, then the payoff. "The big spacing in between" is the brief, so the air here
 * is deliberate and generous — this is the beat the whole timeline lands on.
 *
 * ROUND 5 — TWO LINES CUT. Daniel: "Go ahead and remove the 'Crossed paths, 2021' and the 'Since
 * then...' keep only the 'Why bet on us..' and place it in between the crossed paths and the current
 * placement." So the kicker and the inventory line are gone (deleted from TEAM_CODA, not left
 * unrendered — an unused constant is a comment with extra steps), and one line lands here alone.
 *
 * `mt-32` IS "in between", measured rather than eyeballed: from the flowers' bottom edge, the kicker
 * used to sit at +56 and the payoff at +199. Halfway is +128, which is mt-32 exactly. The label now
 * carries the whole beat on its own, so it gets the air the two of them used to share.
 */
function TeamCoda({ reduced }: { reduced: boolean }) {
  return (
    // Labelled for what is actually in it now. It was "Crossed paths" after the kicker that is gone.
    <section aria-label="Why bet on us" className="mx-auto w-full max-w-page px-gutter">
      <div className={reduced ? 'h-12' : 'min-h-[12svh]'} aria-hidden />
      <CodaBower reduced={reduced} />
      <div className="mx-auto mt-32 max-w-[640px] text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accentOlive">
          {TEAM_CODA.payoffLabel}
        </p>
        {/* Clay's own treatment for this line: large, italic, centred. */}
        <p className="mt-3 font-serifDisplay text-[clamp(1.35rem,2.6vw,1.9rem)] italic leading-snug text-inkBlack">
          {TEAM_CODA.payoff}
        </p>
      </div>
      <div aria-hidden className={reduced ? 'h-16' : 'min-h-[18svh]'} />
    </section>
  );
}

/* --------------------- the founders' parenthesis (task F) -------------------- */

/** Where the arms turn outboard, as a FRACTION of the real margin between the founder rows' edge and
 *  the paper's edge — not a px constant, because that margin is a `max-w-page` remainder and changes
 *  with the viewport. 0.5 hangs the arms down the middle of the air: any further in and they crowd
 *  the portraits, any further out and the organs paint off the edge of their own canvas, which reads
 *  as a broken drawing rather than as a vine running off the page. */
const PAREN_TURN_FRAC = 0.58;
/** Where the arms leave the trunk, as a fraction of the band between the timeline's exit and the
 *  first founder. That band is ALL the room the crossing gets (see armPts), so this is the split
 *  between trunk and swag: lower and the swag has no room and kinks, higher and the line does not
 *  read as arriving before it opens.
 *
 *  0.22 -> 0.10 (round 5). Daniel: "Bring back the beginning of the parenthesis of the founder up so
 *  it does not sit extremely close to the founder texts." Forking higher spends more of the band on
 *  the swag, which is the half that has to get clear of the kicker — at 0.22 the arms were still
 *  crossing the founders' own headline height as they went out. */
const PAREN_FORK_FRAC = 0.1;
/** Organ size along the arms. The spine garland pins 1.5 and the sub-branches 0.95; the arms sit in
 *  open margin with the most air on the page, so they carry the largest foliage. Tuned by looking. */
const PAREN_ORGAN_SCALE = 2.0;
/** The arms' stroke at the fork, as a FRACTION of the trunk's measured width. Lighter than the
 *  trunk: this is the line thinning as it opens and grows out, the way a branch is thinner than the
 *  trunk it left. A fraction rather than a px constant because the trunk's own width is measured off
 *  the timeline's rendered scale and changes with the viewport. */
const PAREN_STEM_FRAC = 0.78;
/** The arm's width at the very tip, as a fraction of the trunk's. Not 0: a stem that vanishes reads
 *  as a fading line rather than a thin one, and the organs still have to hang off something. */
const PAREN_TIP_FRAC = 0.25;

/** How much of the parenthesis's one growth the TRUNK takes before the arms start. The line has to
 *  ARRIVE before it opens — the same trunk → branch order the timeline gets from its `order` lag. */
const PAREN_TRUNK_SHARE = 0.18;
/** How long one arm run takes to draw, as a fraction of the arms' share. Bigger than the gap between
 *  runs (1/10) ON PURPOSE: they overlap, so the arm reads as one line paying out rather than ten
 *  segments switching on in sequence. */
const PAREN_RUN_OVERLAP = 0.34;

// PAREN_STATIONS / PAREN_ORGANS moved to about/parenthesis.ts (the arms' own pure module) so the
// reveal tests can read the real list rather than a copy of it. See there for the t >= 0.34 floor,
// which now has two independent reasons holding it up.

/**
 * THE FOUNDERS' PARENTHESIS — the one line arrives, and opens around the two of them.
 *
 * Daniel: "I'd like the main branch... to actually kind of go into some parentheses and go right and
 * left from Clay, and on the right side and left side to start generating those beautiful flowers
 * and sub-branches", and "The flowers on the left and right side of the founder are quite beautiful
 * but they must connect. The stems at the top must connect with the stem that's unraveling from the
 * bower logo at the top."
 *
 * This REPLACES `FounderBower` (the four vines drawn down the margins). Those were the right
 * flowers in the right place and Daniel liked them — they just grew out of nothing. Recover with:
 *     git show b0150ce -- src/pages/AboutPage.tsx
 *
 * WHY THE STEMS ARE SEPIA SVG AND THE ORGANS ARE PIGMENT, when FounderBower painted the whole vine
 * (`tube: true`): the connection REQUIRES it. A painted gongbi vine and a drawn sepia spine are two
 * different registers — a painterly, semi-transparent, tapering brush against a hard constant-width
 * line — and they cannot meet without a visible seam, whatever the geometry does. The join is the
 * entire ask, so the arms must be the same kind of mark as the thing they join. This is also the
 * graft the spine garland and the sub-branches already use (`tube: false`: the page draws the line,
 * the composer grows the foliage), so the page now does one thing everywhere instead of two.
 *
 * It also settles the colour-law flag round 2 raised, in the conservative direction and without
 * needing a ruling: CLAUDE.md says structure is sepia and pigment is for the botanical specimens.
 * The stems are structure and are sepia; the flowers are botanical and stay in full pigment. Nothing
 * is extended. Daniel's "quite beautiful" was about the flowers, and the flowers are untouched.
 *
 * THE ORNAMENT READS THE LAYOUT AND THE LAYOUT NEVER READS IT BACK. Every number here is measured
 * off the real DOM — the wrapper, the page's content centre, the founder rows' own rects — and
 * nothing reads this component back. See parenthesis.ts for why that is load-bearing, and for the
 * SeamBridge tombstone: it assumed a centred founders block, and the founders are left-aligned.
 */
function FounderParenthesis({ reduced }: { reduced: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<ParenLayout | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  // THE PAGE'S CARD LINE — the founders' equivalent of the timeline camera's. Same rule, same span,
  // same ramp; the only difference is that the frame here is the viewport rather than a panning
  // camera. See reveal.ts. Reduced motion hands back Infinity, so every `growAt` below saturates to
  // 1 and the whole thing settles instantly, fully grown.
  const parenFrameScale = useTimelineFrameScale();
  const pageLine = usePageCardLine(reduced, revealSpanPx(parenFrameScale));

  // MEASURE. Re-measured on resize and on any layout change inside the founders (a ResizeObserver on
  // the rows, not just the window: the rows' height moves with text wrapping at a fixed width too).
  useEffect(() => {
    const host = hostRef.current;
    const wrap = host?.parentElement;
    if (!host || !wrap) return;
    const measure = () => {
      // The ROWS ARE SIBLINGS' CHILDREN, not this element's. `host` is an absolutely-positioned
      // overlay covering the wrapper; the founders live in the wrapper's normal flow next to it.
      const rows = [...wrap.querySelectorAll('[data-founder-row]')];
      const main = host.closest('main');
      if (!rows.length || !main) return;
      const hr = host.getBoundingClientRect();
      if (hr.width <= 0) return; // below `lg` this overlay is display:none and has no box

      // The page's CONTENT centre, exactly as the timeline computes the x its descent exits on
      // (see `pageCenterVX`). Read the same way from the same element, so the two agree by
      // construction rather than by two constants that have to be kept level with each other.
      const mr = main.getBoundingClientRect();
      const cs = getComputedStyle(main);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      const contentCenter = mr.left + padL + (mr.width - padL - padR) / 2;

      const boxes = rows.map((r) => {
        const b = r.getBoundingClientRect();
        return { y0: b.top - hr.top, y1: b.bottom - hr.top };
      });
      // The rows' real edges — NOT the page centre, and not the section's box.
      const edges = rows.map((r) => r.getBoundingClientRect());
      const rowLeft = Math.min(...edges.map((e) => e.left)) - hr.left;
      const rowRight = Math.max(...edges.map((e) => e.right)) - hr.left;

      // WHERE THE TIMELINE'S LINE ACTUALLY STOPS. The two modes are genuinely different geometry and
      // assuming either one leaves a visible gap in the other. Both are MEASURED off the real
      // elements rather than derived from constants, because both were got wrong by reasoning.
      // The DESKTOP camera svg explicitly (`data-timeline-camera`), not "the first svg under the
      // track". The mobile timeline mounts its own svgs (twist glyph, finale mark) below `lg`; a bare
      // `[data-timeline-track] svg` would return one of those and read a nonsense trunk height. This
      // overlay is display:none below `lg` anyway (the `hr.width <= 0` guard above returns early), so
      // when the mobile tree is up both of these resolve to null and no trunk is drawn — correct.
      const tlSvg = document.querySelector('[data-timeline-camera]');
      const tlFrame = document.querySelector('[data-timeline-frame]');
      const tr = tlSvg?.getBoundingClientRect();
      let trunkY0 = 0;
      if (reduced && tr) {
        // REDUCED: one static full-height SVG. Its drawing runs 80 world units PAST its own exit
        // (see `H`), so the line stops ~85px ABOVE this overlay's top edge.
        trunkY0 = tr.top + DESCENT_EXIT_FRAC * tr.height - hr.top;
      } else if (tr && tlFrame) {
        // MOTION: a sticky viewport-height row inside a 1080vh track. The row bottoms out at the
        // track's bottom, which IS this overlay's top, and the descent exits on the frame's bottom
        // edge at the end of the track.
        //
        // BUT THE FRAME'S BOTTOM IS NOT THE ROW'S BOTTOM. The row carries a bottom padding — the
        // hero lockup's centring lift — so the descent exits on the frame's CONTENT bottom (the
        // camera's viewH window) while this overlay begins at the frame's BORDER bottom, one padding
        // lower. The trunk must start that padding ABOVE this overlay's top to meet the line.
        //
        // THIS IS THE FRAME'S BOTTOM PADDING, MEASURED DIRECTLY — and it used to read
        // `-(fr.bottom - tr.bottom)`, "how far the frame's bottom sits below the svg's", which WAS the
        // padding until the item-1b bleed grew to reach it. The svg renders `BLEED_PX` past its layout
        // box (`height: 100% + BLEED`, `marginBottom: -BLEED`); once that bleed equalled the padding
        // the two bottoms coincided, the difference went to 0, and the trunk started a full ~132px
        // BELOW the line it continues — a visible break at every founders-reading scroll (round 11).
        // The padding is what the gap actually is and, unlike the bottom-to-bottom delta, it does not
        // move when the bleed does. `padBelow` is pure CSS and scroll-invariant, so it reads correctly
        // at any scroll position — which matters, because at mount the track is at p=0 and the exit is
        // nowhere near here.
        trunkY0 = -(parseFloat(getComputedStyle(tlFrame).paddingBottom) || 0);
      }

      // THE LINE'S WEIGHT, measured. See ParenLayout.trunkW: the timeline scales world units into
      // its frame, so the spine's rendered width is a function of the viewport and copying its
      // constant puts a 44% step at the join.
      const trunkW = tr ? SPINE_W * (tr.width / TIMELINE_W) : 2.8;

      const bandTop = Math.min(trunkY0, 0);
      setLayout({
        w: hr.width,
        h: hr.height,
        // The overlay's own page y, so the PAGE's card line (a page coordinate) can be read against
        // this overlay's local geometry. Measured, like everything else here.
        pageTop: hr.top + window.scrollY,
        // The timeline's px-per-world-unit, so the reveal spans the same DISTANCE ON SCREEN here as
        // it does up there. See revealSpanPx: reusing the raw constant would be a different motion
        // wearing the same number.
        frameScale: tr ? tr.width / TIMELINE_W : 0.696,
        viewH: window.innerHeight,
        headerH: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 84,
        trunkX: contentCenter - hr.left,
        trunkY0,
        forkY: bandTop + (boxes[0].y0 - bandTop) * PAREN_FORK_FRAC,
        trunkW,
        // The turn lines hang in the REAL air outside the rows, measured. Clamped into the overlay
        // so an arm can never be asked to grow off its own canvas.
        leftX: Math.max(6, rowLeft * PAREN_TURN_FRAC),
        rightX: Math.min(hr.width - 6, rowRight + (hr.width - rowRight) * PAREN_TURN_FRAC),
        // The rows' REAL edges, so the arms can be held off the text rather than trusted to miss it.
        rowLeft,
        rowRight,
        rows: boxes,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    wrap.querySelectorAll('[data-founder-row]').forEach((r) => ro.observe(r));
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const arms = useMemo(
    () => (layout ? { trunk: trunkPts(layout), left: armPts(layout, -1), right: armPts(layout, 1) } : null),
    [layout],
  );

  /**
   * THE ORGANS' STATIONS, resolved where the painter ACTUALLY stamps them — which is NOT the arm's own
   * points. The composer resamples every vine to an even 4px arc-length polyline first (garland.ts
   * `resample`), then indexes `round(t * (n-1))` on THAT. `arms[side]` is a 6px centripetal
   * Catmull-Rom sampling whose spacing is uneven — dense on the belly, sparse across the tight tail
   * curl — so indexing t on it lands a different world point than the painter's even resample,
   * off by the most exactly where the curvature is highest. That was the detached bloom near the old
   * terminus (round 11 item 7): the reveal disc sat where t*index pointed, the painted flower sat
   * where t*arclength did, and the mask uncovered bare paper beside the bloom. Resample here the SAME
   * way, so disc and organ are one point by construction, not two that are supposed to agree.
   */
  const marks = useMemo(() => {
    if (!arms) return [];
    const out: Array<{ x: number; y: number; arm: 'left' | 'right'; t: number }> = [];
    (['left', 'right'] as const).forEach((side) => {
      const rpts = resample(arms[side].map((p) => [p.x, p.y] as [number, number]), 4);
      for (const t of PAREN_STATIONS) {
        const i = Math.max(1, Math.min(rpts.length - 1, Math.round(t * (rpts.length - 1))));
        const [x, y] = rpts[i];
        out.push({ x, y, arm: side, t });
      }
    });
    return out;
  }, [arms]);

  // PAINT. The organs only; the stems are the SVG below. One request for both arms, because
  // `createFlora` derives the species from the seed: two requests would grow two species, and two
  // requests at one seed would restart the same rng and stamp identical organs (see GarlandOpts.vines).
  const w = layout ? Math.round(layout.w) : 0;
  const h = layout ? Math.round(layout.h) : 0;
  const armsKey = arms ? `${w}x${h}` : '';
  // The card line, in this overlay's own coordinates, and the reveal's span converted through the
  // timeline's scale so the founders grow over the same distance ON SCREEN that the timeline does.
  const localLine = layout ? pageLine - layout.pageTop : 0;

  /*
   * THE PARENTHESIS GROWS AS ONE EVENT, AND IT IS FINISHED BEFORE THE READER ARRIVES.
   *
   * Daniel: "Let the flowers and vine make their loading animation earlier in the cycle, so they are
   * fully visualized before being out of frame, like it currently is now."
   *
   * MEASURED, and it was worse than "late": the parenthesis first reached fully-grown at scrollY
   * 10440, at which point its own top was 636px ABOVE the viewport. It never existed finished and
   * on screen at the same time. The animation was playing to nobody.
   *
   * THE CAUSE WAS MINE. Each taper run was keyed to its OWN y, so a 650px arm's tail only drew when
   * the card line reached the tail — by which time its head was long gone. That was a local fix for
   * "a long arm should not shoot out whole", and it traded one failure for a worse one. The
   * timeline's own rule is the right one after all: a stem draws root → tip as ONE event. The arm is
   * simply a long stem.
   *
   * So: ONE progress for the whole ornament, and the fix is the START, not the duration (compressing
   * it would trade "invisible" for "too fast to see", which is not what he asked for).
   *   begins  when the wrapper's top first appears at the BOTTOM of the screen (readerLead)
   *   ends    when the founders are framed — the reader looks up and it is already done
   *
   * Both ends are derived from the measured layout and the live viewport, not pinned: the span is
   * whatever distance separates those two moments.
   */
  // The viewport's height, live — the lead and the completion point are both fractions of it.
  const lead = layout ? readerLead(layout.viewH) : 0;
  // "Framed" = the founders' first row parked just under the fixed header. The header is real and
  // covers the top of every viewport, so it is part of where the reader is actually looking.
  const doneAt = layout ? (layout.rows[0]?.y0 ?? 0) + layout.viewH * GROWN_BY - layout.headerH : 1;
  const parenSpan = Math.max(1, doneAt + lead);
  const parenGrow = layout ? growAt(localLine, -lead, parenSpan) : 0;

  /* PARENTS BEFORE CHILDREN, out of one progress. The trunk takes the first PAREN_TRUNK_SHARE of the
     event and the arms the rest, so the line arrives before it opens — the same trunk → branch order
     the timeline gets from its `order` lag. Each arm run then pays out over its own slice of the
     arms' share, which is what keeps a 650px arm growing along its length instead of appearing whole
     while still preserving the one-event timing. */
  const trunkGrow = clamp01(parenGrow / PAREN_TRUNK_SHARE);
  const runGrow = (run: TaperRun) => {
    // THE ARMS FINISH DRAWING AT STEM_SHARE, NOT AT 1, and the last third of the event is the tip
    // organs opening. Round 10, item 6: with the arms paying out to parenGrow=1 there was no room
    // left for an organ to open, so PAREN_STATIONS 0.74 / 0.83 / 0.92 could never reach full opacity
    // and 0.92 was invisible at every scroll position, forever — three of seven stations, on both
    // arms, on the most prominent ornament on the page. See reveal.ts STEM_SHARE for the measurement
    // and for why squeezing the organs instead would put flowers ahead of the stem.
    //
    // The invariant still holds here and gets a margin: an organ at `t` opens when the arm has paid
    // out to (0.66t - 0.06) / 0.48, which is >= t for t >= 0.333. Every station is >= 0.36. It is
    // tight at the root end, so a station below ~0.34 would bloom ahead of its own stem — there is a
    // test asserting exactly that, because the next person to add a station will not know this.
    const armsP = clamp01((parenGrow - PAREN_TRUNK_SHARE) / (STEM_SHARE - PAREN_TRUNK_SHARE));
    // `t0` is where this run starts along its arm, so a run does not begin until the arm has paid
    // out to it — root → tip, out of one progress. The overlap is what stops it reading as ten
    // separate segments switching on: each run is still drawing while the next one starts.
    //
    // The `(1 + OVERLAP)` is not a fudge: without it the LAST run starts at t0 ~= 0.9 and has only
    // OVERLAP (0.34) of runway left, so it tops out at 0.29 and the arm's tail NEVER finishes. The
    // arm has to be complete when armsP hits 1, so the ramp is stretched to end there.
    return clamp01((armsP * (1 + PAREN_RUN_OVERLAP) - run.t0) / PAREN_RUN_OVERLAP);
  };
  useEffect(() => {
    if (!arms || !w || !h) return;
    let live = true;
    requestGarland({
      // THE PAGE'S SPECIES FOR THIS VISIT — the same plant the spine and the sub-branches grow.
      //
      // NOT `${GARLAND_SEED}/founders`, which is what FounderBower used, and the difference is not
      // cosmetic: `createFlora(seed)` derives the SPECIES from the seed, so a suffix does not give
      // you another take of the same plant, it gives you a different plant. That suffix grew a
      // species nobody ever curated and it drew exactly the lottery the pool exists to stop —
      // washed-out cream blooms and curled, edge-on leaves, beside a spine of clean pink blossom.
      // See about/species.ts.
      seed: PAGE_SPECIES,
      voice: 'pigment',
      width: w,
      height: h,
      vines: ([arms.left, arms.right] as const).map((pts) => ({
        path: pts.map((p) => [p.x, p.y] as [number, number]),
        stations: PAREN_STATIONS.map((t, i) => ({ t, organ: PAREN_ORGANS[i] })),
      })),
      scale: PAREN_ORGAN_SCALE,
      tube: false,
    })
      .then((painted) => {
        if (live) setUrl(painted);
      })
      .catch((err: unknown) => {
        // The founders read fine with stems and no flowers; a broken painting room must not look
        // like taste.
        console.error('gongbi founder parenthesis failed:', err);
      });
    // NOTHING TO REVOKE. The object URL belongs to the painter's session cache and is shared by
    // every caller of this garland — revoking it here would hand the next mount a dead URL and the
    // ornament would silently vanish. See requestGarland.
    return () => {
      live = false;
    };
    // `arms` is a fresh object every render; key the effect on the measured size instead, or it
    // re-runs forever, each pass minting a blob URL and revoking the last. That bug shipped once
    // here already — it painted, so it looked fine, and the live QA caught it as 1233 failed
    // requests for revoked blobs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armsKey]);

  // The overlay ALWAYS renders, even with nothing to draw in it yet. It is what `measure` measures
  // and what the ResizeObserver watches, so returning null until there is a layout is a deadlock:
  // no element, no ref, no measurement, no layout, no element. (It shipped that way for one build.)
  // THE OVERLAY REACHES OUT PAST `main` INTO THE PAGE'S OWN MARGINS (`w-screen`, centred), because
  // that is where the flowers live. `main` is a 1354px content box on a 1440px page, and the founder
  // rows fill it to within ~86px a side — so an overlay clipped to `main` gives the arms 86px of air
  // and paints half of every organ off the edge of its own canvas. A clipped leaf reads as a broken
  // drawing (round 1 learned this on the spine garland). The page's real margin is ~170px a side,
  // which is what FounderBower's 160px strips used, and it is enough.
  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-1/2 z-0 hidden w-screen -translate-x-1/2 lg:block"
    >
      {/* The painted organs, 1:1 over the same coordinates the stems are drawn in — never scaled.
          An upscaled painting is this page's recurring bug (CLAUDE.md). */}
      {url && (
        <img
          src={url}
          alt=""
          className="absolute left-0 top-0"
          style={{ width: w, height: h, mask: reduced ? undefined : 'url(#paren-organ-mask)', WebkitMask: reduced ? undefined : 'url(#paren-organ-mask)' }}
        />
      )}
      {/* `overflow-visible` lets the trunk's overshoot and its round cap kiss the timeline's frame
          above rather than stopping at this box's edge. */}
      {arms && layout && (
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${layout.w} ${layout.h}`}
          fill="none"
          stroke={INK_SEPIA}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* THE ORGANS OPEN A BEAT BEHIND THEIR OWN STEM — the timeline's mechanism exactly (see
              reveal.ts and SubBranches). The composer paints every organ into ONE bitmap, so there is
              no per-organ element to fade and the reveal has to be a mask of discs. */}
          <defs>
            {/* The same two stops, and the same reasons — see the long note at `#coda-organ-disc`.
                Three identical copies of this gradient exist; a fix to one that skips the others just
                moves which flowers are blurred. */}
            <radialGradient id="paren-organ-disc">
              <stop offset="0.9" stopColor="#fff" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <mask id="paren-organ-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={layout.w} height={layout.h}>
              {marks.map((m, i) => {
                const o = organAt(parenGrow, m.t);
                if (o <= 0.001) return null;
                return <circle key={i} cx={m.x} cy={m.y} r={ORGAN_DISC_R} fill="url(#paren-organ-disc)" opacity={o} />;
              })}
            </mask>
          </defs>
          {/* The trunk is the spine still, so it keeps the spine's weight, constant.
              `data-paren-trunk` is qa/founder-parenthesis.mjs's handle on the join. */}
          <path
            data-paren-trunk
            d={polyD(arms.trunk)}
            strokeWidth={layout.trunkW}
            {...dashProps(polyLen(arms.trunk), trunkGrow)}
          />
          {/* The arms TAPER root → tip: the line thinning as it grows away from the trunk, so the
              stem reads as a stem and not a constant-width rail. (It no longer ends in a blunt cap in
              open paper — the two tips now MEET at the bower's base, item 7 — but the taper is still
              what gives the closing curve its drawn-stem weight.) See taperRuns.
              Each run also DRAWS ON as the card line reaches it, which is what makes a long arm grow
              with the reader instead of shooting out whole the moment the line clears the fork. The
              arms are non-decreasing in y down to the join, so reading each run at its own y is safe
              here — unlike the space-colonization branches, where 195 of 332 organs sit above their
              own root. */}
          {([arms.left, arms.right] as const).map((pts, i) => (
            // Grouped per arm so the meeting can be pinned: `data-paren-arm`'s last run ends on the
            // bower's join, and qa/founder-parenthesis.mjs reads left vs right to assert 0px there —
            // the same standard as the trunk seam, a separate named concern from it.
            <g key={i} data-paren-arm={i === 0 ? 'left' : 'right'}>
              {taperRuns(pts).map((run, j) => (
                <path
                  key={j}
                  d={run.d}
                  strokeWidth={
                    layout.trunkW * (PAREN_STEM_FRAC + (PAREN_TIP_FRAC - PAREN_STEM_FRAC) * run.t)
                  }
                  {...dashProps(polyLen(run.pts), runGrow(run))}
                />
              ))}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

/*
 * SeamBridge — DELETED 2026-07-16 (round 3). Recover with:
 *     git show fd3cbcb -- src/pages/AboutPage.tsx
 *
 * It drew a plumb INK_SEPIA line down the page centre, across the seam, to the founders'
 * CONVERGENCE NODE. That node was part of the leader-line scaffolding deleted in round 2, and Clay's
 * founders (ported the same round) are left-aligned rather than centred — so the line had been
 * descending to the page centre and stopping on nothing. A line that arrives nowhere reads as broken,
 * correctly, and it should not sit on the page waiting for its fix.
 *
 * Deleted rather than left unmounted because dead code does not compile here, and an unmounted
 * component is a comment with extra steps. See the TODO(F) at the seam for where the line is going —
 * Daniel's own answer gives it a better destination than the plumb line ever had.
 */

/** The founders' small-caps voice, lifted verbatim from the retired ascent draft. */
const MONO_SMALL = 'font-mono text-[12px] uppercase tracking-[0.08em]';

/**
 * THE FOUNDERS SIT ON CENTRE (round 10, item 4b), and this width is the whole mechanism. Daniel:
 * "Move the image and text right, into the vacated space, so the composition sits on centre" — with
 * "the size is right, change nothing else here" over the top of it.
 *
 * THE OBVIOUS FIX IS THE WRONG ONE, AND THIS WAS MEASURED, NOT REASONED. Deleting the specimen and
 * leaving the row at `grid-cols-[2.6fr_9.1fr]` re-divides the SAME paper between two columns: the
 * portrait goes 186x233 -> 239x299 and the founders 647 -> 744px TALL (a wider facts column wraps to
 * more lines, and a grid row is as tall as its tallest column — CLAUDE.md). That silently resizes
 * both things he said not to touch, blows the one-frame budget qa/founder-frame.mjs guards (726px),
 * and REPORTS DEAD CENTRE THE WHOLE TIME — centring alone does not catch it. `fr` is a share of what
 * is there, not a width, so the way to keep a track's pixels is to keep its denominator.
 *
 * So the tracks keep 2.6 and 9.1 of the original 14.7 and the BLOCK gets narrower instead: exactly
 * the two surviving tracks plus their one surviving gap wide, with `mx-auto` laying the vacated
 * (3fr + one gap) down as equal margins.
 *   free space = 100% - 3rem                  (the three tracks had two 1.5rem gaps)
 *   block      = free * 11.7/14.7 + 1.5rem    (2.6 + 9.1 of 14.7, plus the one gap that survives)
 * Measured at the 1100px page measure: portrait 186x233 before AND after, block 289..1151, margins
 * 119/119, centre 720 = the content box's own centre.
 *
 * IT WRAPPED THE ROWS ONLY AND LEFT THE KICKER BEHIND — for one round. "The founders." was flush
 * with the portrait's left edge while the rows sat on centre, 119px adrift of the composition it
 * labels. Daniel has now looked and ruled on it: "Move the image and text right, into the vacated
 * space... and move 'The founders' text to be centered" (round 10 continued, item 4c) — the read
 * is that the kicker's leftward hang was WHY the centred block still looked left-heavy, not that
 * the block itself needs to move again. The rows keep this exact width and position: they are
 * already measured onto the content centre above, and translating them further right would be an
 * unpinned number with nothing behind it — precisely the trap this file's own history warns about.
 *
 * THE KICKER IS `text-center`, NOT A COPY OF THIS BLOCK'S FLUSH-LEFT WRAP, and the difference is
 * what clears the vine that the flush-left version could not. The rejected attempt above wrapped the
 * kicker IN this narrower block, left-aligned — which put its glyph run at 289..394, and 394 sits
 * inside `armPts`' anchor-3→anchor-4 transit (`trunkX + reach*0.28` to `trunkX + reach*0.72`, the
 * zone the arm is still crossing on its way to `keepOut(turnX)` just above `rows[0].y0`, which is
 * where the kicker sits). `text-center` on the kicker's own full section width lands its glyph run
 * on the SAME content centre as `trunkX` itself — at the 1100px measure that block a run of
 * roughly 665..775 — which is past anchor 4 (~305..390 at that height) and short of the trunk's own
 * vertical run (which ends at `forkY`, well above this row). By the anchor arithmetic the two do not
 * overlap.
 *
 * THAT LAST PARAGRAPH IS REASONED FROM THE ANCHOR ARITHMETIC, NOT MEASURED, and this file's own
 * history is a record of exactly that kind of confident paragraph turning out to be wrong about the
 * one case nobody checked. This session had no browser or Bash access to run
 * `qa/founder-frame.mjs` or take a screenshot — do not treat this comment as verification. Run the
 * probe (`node qa/founder-frame.mjs`) before shipping; if it reports a crossing, the fix is in
 * `armPts` (clamp the anchors whose y falls in the kicker's measured band against the kicker's own
 * left/right, the same way `keepOut` already does for the rows), not a nudge back off centre.
 */
const FOUNDERS_BLOCK_W = 'md:mx-auto md:w-[calc((100%_-_3rem)*11.7/14.7_+_1.5rem)]';

/**
 * One founder, as a two-band sheet: PORTRAIT · FACTS, read across, centred on the paper.
 *
 * This IS the retired ascent draft's `Founders()` (`git show
 * about-v2-nonflowers:src/pages/ascent/AscentPage.tsx`), ported wholesale on Daniel's ruling —
 * "I much preferred Clay's founder page... the entirety of it is a lot better than my current
 * ones." Kept exactly: the bordered 4:5 portrait with its caption UNDER it (name over role, both
 * mono) and the facts as a real `<dl>`. What the old node did — a 112px circular crop, the role in
 * olive, the facts squeezed into a 13.5px list on leader lines — is all gone.
 *
 * THE THIRD BAND WAS A SPECIMEN, and round 10 deleted it (item 4a); the row is a centred pair now.
 * The draft's `flex-col-reverse` wrappers are also dropped: they existed only to invert DOM order
 * for the ascent's column-reverse scroller. This page reads downward, so reading order already IS
 * visual order, and the source's intended sequence (kicker, then Clay, then Daniel) survives.
 */
function FounderNode({ person }: { person: TeamMember }) {
  return (
    // `data-founder-row` is what the parenthesis measures itself against — the row's REAL laid-out
    // rect, read at runtime. It is the ornament's only handle on the layout, and the arrow points
    // one way: nothing here reads the parenthesis back.
    // THE SPECIMEN COLUMN IS GONE (round 10, item 4a). Two tracks now, and they keep their share of
    // the ORIGINAL fourteen-point-seven rather than re-dividing the paper between them — the width
    // that makes that true is on the centred block in AboutPage; see FOUNDERS_BLOCK_W.
    <div
      data-founder-row
      className="grid gap-6 md:grid-cols-[minmax(0,2.6fr)_minmax(0,9.1fr)] md:items-start"
    >
      <figure>
        {person.image ? (
          <img
            src={person.image}
            srcSet={srcSetFor(person.image)}
            sizes="(max-width: 768px) 40vw, 200px"
            alt={`Portrait of ${person.name}`}
            loading="lazy"
            decoding="async"
            className="aspect-[4/5] w-full border border-inkBlack/12 object-cover"
          />
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center border border-dashed border-inkBlack/20">
            <OculusMark size={36} className="h-auto w-9 text-inkBlack/20" />
          </div>
        )}
        <figcaption className="mt-2">
          <span className={`${MONO_SMALL} block text-inkBlack`}>{person.name}</span>
          <span className={`${MONO_SMALL} block text-inkBlack/60`}>{person.role}</span>
        </figcaption>
      </figure>

      {/* WHAT SETS THIS ROW'S HEIGHT KEEPS SWAPPING, AND THAT IS WHY THIS FIX HAS LANDED TWICE AND
          NOT WORKED. A grid row is as tall as its tallest column (CLAUDE.md), and the tallest column
          here is not stable:
            round 3  portrait 375, dl 444/472  -> the DL was tallest; shrinking the pictures alone
                     would have moved nothing, so the type came down (17 -> 15) and the row hit 372.
            round 5  portrait 372, dl 301/322  -> the PORTRAIT is tallest now, and shrinking IT alone
                     stops at ~322, where the dl takes over again.
          So this pass takes both down together, and there is no point taking either below the other.

          The columns are re-proportioned rather than just scaled: 3.7/7/4 -> 2.6/9.1/3. The portrait
          and the specimen give their width to the FACTS, which is what actually buys height — a wider
          measure costs fewer LINES, and lines are the height. Widening the measure is the one move
          here that makes the row shorter without making anything smaller. */}
      <dl className="space-y-3">
        {person.facts.map((fact) => (
          <div key={fact.label}>
            <dt className={`${MONO_SMALL} text-inkBlack/60`}>{fact.label}</dt>
            <dd className="mt-0.5 max-w-[82ch] text-[14px] leading-snug opacity-90">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {/* THE SPECIMEN HUNG HERE AND IS DELETED (round 10, item 4a). It was a 210px FanPainting of
          FOUNDER_SPECIMENS[person.id], signed with a mono `herbal · seed "bower/…"` caption —
          Daniel named both by their captions and cut them: "Delete both right-side specimen
          paintings... Both gone, seed labels with them." The caption WAS the seed label, so it went
          with the slot; nothing else printed a seed. The commission ledger they were the last
          readers of is deleted too — see paintings.ts, which set that precedent itself when the
          discipline frontispieces went ("a commission nothing hangs is a painting the worker still
          queues and no one ever sees"). Pigment survives everywhere else on the page: the
          parenthesis' organs, the spine garland, the coda. This deletes two paintings, not the law
          that allows them. */}
    </div>
  );
}

/* --------------------------------- page ----------------------------------- */

export function AboutPage() {
  const reduced = useReducedMotion();
  // The one-time narration intro plays over the page; while it does, the content is held at
  // opacity 0 (still in layout, so the intro can measure the header title to fly onto).
  const [intro, setIntro] = useState(decideAboutIntro);
  const [revealed, setRevealed] = useState(() => !intro);
  const onReveal = useCallback(() => setRevealed(true), []);
  const onDone = useCallback(() => setIntro(false), []);

  // The hash router doesn't reset scroll between routes; start at the top so the header
  // reads first AND the intro measures the title's on-screen rect correctly.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen w-full bg-paperVellum text-inkBlack">
      <SplashHeader transparent />

      {/* NOTHING TOUCHES THE HEADER (round 11). The transparent nav floats directly on the page, so
          content scrolling up would ride straight over "bower" and the links. This fixed band fades
          scrolling content into the page ground (paperVellum) before it reaches the nav — the same
          dissolve the drawing already uses at its own top edge. It is OPAQUE through the header's own
          height (`--header-h`) and fades out over the ~2.5rem below it, so the line/text is gone by
          the time it would meet the chrome and eased in just under it.
          - `z-40`: under the header (`z-50`) so the nav stays crisp on top, over the content.
          - `max-w-canvas`: the About content measure — the header's own frame, not full-bleed. Its
            paperVellum top blends invisibly into the page's paperVellum margins, so there is no band
            edge; only content passing under it fades.
          - `pointer-events-none`: it must never eat a nav click or a scroll. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center">
        <div
          className="w-full max-w-canvas"
          style={{
            height: 'calc(var(--header-h) + 2.5rem)',
            background: 'linear-gradient(to bottom, #FBF9F3, #FBF9F3 var(--header-h), rgba(251,249,243,0))',
          }}
        />
      </div>

      <motion.main
        className="mx-auto w-full max-w-canvas px-gutter pb-24 pt-[calc(var(--header-h)+2rem)]"
        initial={false}
        animate={{ opacity: revealed ? 1 : 0 }}
        transition={{ duration: revealed ? 0.6 : 0, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* PORTION ONE — the title AND the sequence, together. The drawing starts immediately, in the
            same frame as the sentence it is the proof of, and the two questions surface in that same
            column as the camera reaches the years that earned them. */}
        <section aria-label="How we crossed paths">
          <CrossPathsTimeline
            title={
              // Centred + full-width below lg (the mobile landed state Sai's spec calls for); the
              // desktop left-slot is restored at lg. AboutIntro reads this element's own textAlign and
              // flies onto it, so the narration lands convincingly centred on mobile without a
              // mid-flight alignment snap.
              <h1 data-about-title className={`${TITLE_CLASS} mx-auto max-w-[16ch] text-center lg:mx-0 lg:text-left`}>
                {TITLE}
              </h1>
            }
            questions={QUESTIONS}
            revealed={revealed}
          />
        </section>

        {/* THE ARRIVAL (task F). The seam and the founders are ONE positioning context, because the
            line that crosses the seam and the parenthesis that opens around the founders are one
            gesture and must be measured in one coordinate system. The parenthesis is painted over
            the whole of it; the seam spacer inside is still just the paper gap.

            WHY THIS WRAPPER'S TOP IS THE RIGHT PLACE TO ARRIVE, in both modes. Reduced: the timeline
            is a static full-height SVG and its bottom edge is this wrapper's top edge. Motion: the
            timeline is a sticky viewport-height frame inside a 1080vh track, and a sticky box BOTTOMS
            OUT at its track's bottom — so from p=1 onward the frame's bottom edge sits exactly at the
            track's bottom, in PAGE coordinates, and stays there however far you scroll. The descent
            exits at that edge on the page's content centre. So there is one fixed point where the
            line hands over, and it is (content centre, this wrapper's top) either way. */}
        <div className="relative">
          <FounderParenthesis reduced={reduced} />

          {/* The seam: the paper gap between the timeline and the founders. Real layout. */}
          <div aria-hidden className={reduced ? 'h-20' : 'min-h-[22svh]'} />

          {/* The founders. AFTER the sequence: by the time you meet them, you already know where they
              came from. The composition is the retired ascent draft's, ported wholesale — see
              FounderNode. `max-w-page` is that draft's own measure (Frame measure="page"), which the
              5/7/5 band needs; the old block was clamped to 1000px for roots that no longer exist.

              NOTE on the header: the draft's <main> had NO pt-header — only its Summit() added one
              locally — so its founders slid under the fixed SplashHeader (position:fixed, top-0,
              z-50). Ported here the bug cannot recur: this page's <main> carries
              pt-[calc(var(--header-h)+2rem)] globally, and the founders sit mid-page besides. */}
          <section aria-label="The founders" className="relative mx-auto w-full max-w-page px-gutter">
            <div className="relative z-10">
              {/* CENTRED (round 10 continued, item 4c) — see the note on FOUNDERS_BLOCK_W for why
                  this is `text-center` on the FULL section width and not a copy of the rows' own
                  narrower flush-left block. */}
              <p className={`${MONO_SMALL} text-center text-inkBlack/60`}>The founders.</p>

              <div className={`mt-4 flex flex-col gap-6 ${FOUNDERS_BLOCK_W}`}>
                {TEAM.map((person) => (
                  <FounderNode key={person.id} person={person} />
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* THE CODA — moved OUT of the founders section on 2026-07-16 (round 3). Two of Daniel's notes
            meet here and pull the same way:
              G: "I want the entire founder page to appear on one frame within the screen."
              H: "the cross paths and 'the obsession is real and it is old' — I really like some of the
                  flowers that Clay had in the background in his version and the big spacing in
                  between... I want you to bring back the flowers and the beautiful ornamentation as
                  the ending of the timeline, and at the bottom to have all the projects."
            So the coda is not the founders' tail; it is the timeline's ENDING, and it wants its own
            air. Lifting it out is also 291px of the 585 the founders had to lose. */}
        <TeamCoda reduced={reduced} />

        {/* PORTION TWO — the work, most recent first. The founders → work line arrives at the page
            centre right here. The section owns a viewport's height, the header takes what it needs, and
            the master-detail fills the rest; the detail panel scrolls if a project runs long. */}
        <section
          aria-label="Projects"
          className="flex h-[calc(100svh-var(--header-h)-1.5rem)] min-h-[640px] flex-col border-t border-inkBlack/12 pt-6"
        >
          <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.18em] text-inkBlack/40">The Work</h2>
            <span className="font-serifDisplay text-[15px] italic text-inkBlack/50">most recent first</span>
          </div>
          <ListView reduced={reduced} />
        </section>
      </motion.main>

      <Footer />

      {intro && (
        <AboutIntro title={TITLE} titleClassName={TITLE_CLASS} onReveal={onReveal} onDone={onDone} />
      )}
    </div>
  );
}
