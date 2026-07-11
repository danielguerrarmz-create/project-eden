/**
 * HeroReveal.tsx — the home hero.
 *
 * 2026-07-10: the timed 2D-Oculus -> 3D-gridshell -> render reveal (the three.js
 * `HeroScene` animation) has been TABLED. The hero is now a single photographic
 * beauty still with the outcome copy over it. The image's entrance is owned by the
 * one-time BowerIntro loader (bower wordmark -> spinning Oculus -> the image fades in),
 * so the hero itself just holds the finished still; only the copy animates, growing in
 * once the intro veil lifts.
 *
 * The old HeroScene / capture / video-record machinery still lives in HeroScene.tsx
 * and heroStill.ts (tabled, unreferenced here) so the 3D reveal can be relanded later.
 *
 * Copy layout: a lower-LEFT column (not a centered band) so the middle + right of the
 * image stay open. The hero sentence is set in the hand-lettered "Realistic Nature"
 * face (font-heroScript) and the one big product word "Eden" in "Paperlight Script"
 * (font-handwrite).
 *
 * Fallbacks:
 *   - reduced motion / SSR -> the finished still + copy, no growth animation.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import type { EngineOutputs } from '../../engine/types';
import { routes } from '../../routing';
import { CTA_PRIMARY_BUYER } from '../../data/config';
import { SESSION_KEY, INTRO_DONE_EVENT } from './BowerIntro';
import { HERO_STILL } from './heroStill';

export type HeroMode = 'poster' | 'static' | 'reveal';

/**
 * Pure mode decision (unit-tested). Server -> poster (finished markup, copy present).
 * Reduced motion -> static (finished still, no growth). Browser + motion -> reveal
 * (the copy grows in once the intro veil lifts).
 */
export function heroMode(o: { isBrowser: boolean; reduced: boolean }): HeroMode {
  if (!o.isBrowser) return 'poster';
  if (o.reduced) return 'static';
  return 'reveal';
}

/**
 * The product name "Eden" as the hero's one hand-lettered moment, set in the cursive
 * `handwrite` face (Paperlight Script). Real, selectable, accessible text — not a path.
 */
function EdenWord({ className = '' }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Eden"
      className={`inline-block font-handwrite font-normal leading-[0.9] ${className}`}
    >
      Eden
    </span>
  );
}

/**
 * The hero copy's GROWTH reveal: each line rises from its own baseline under an upward
 * clip (like something sprouting) + a slight scale-from-smaller, on a soft spring, and
 * the lines stagger so it composes as one orchestrated moment. Reduced-motion / SSR
 * never reach this: those render the finished state via `orchestrate=false`.
 */
const copyContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.04 } },
};
const growLine: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96, clipPath: 'inset(100% 0% -12% 0%)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    clipPath: 'inset(0% 0% -12% 0%)',
    transition: { type: 'spring', stiffness: 120, damping: 20, mass: 0.9 },
  },
};

function HeroCopy({
  orchestrate = false,
  show = true,
}: {
  /** True in the browser reveal: start hidden and grow in when `show` flips. Off on
   *  poster / reduced-motion so the text renders finished with no motion. */
  orchestrate?: boolean;
  show?: boolean;
}) {
  return (
    <motion.div
      variants={copyContainer}
      initial={orchestrate ? 'hidden' : 'show'}
      animate={show ? 'show' : 'hidden'}
      className="text-paperVellum [text-shadow:0_1px_18px_rgba(0,0,0,0.45)]"
    >
      <h1 className="max-w-[14ch] font-heroScript text-[clamp(2.25rem,4.8vw,4rem)] font-normal leading-[1.08]">
        <motion.span variants={growLine} className="block origin-bottom will-change-transform">
          Grow a living
        </motion.span>
        {/* The product name is the hero's one display moment: a hand-lettered word on
            its own line, drastically larger than the sentence. */}
        {/* The script "Eden" carries its ink high in its line box (empty descender space
            below), so equal margins read as sitting closer to the line above. Asymmetric
            margins (more above, tighter below) drop it to the optical centre of the gap. */}
        <EdenWord className="mt-3 -mb-2 block text-[clamp(4.5rem,12vw,8.5rem)]" />
        <motion.span variants={growLine} className="block origin-bottom will-change-transform">
          in your garden.
        </motion.span>
      </h1>
      <motion.p
        variants={growLine}
        className="mt-4 max-w-[36ch] origin-bottom font-serifDisplay text-[17px] leading-snug text-paperVellum/90 will-change-transform"
      >
        A one of a kind living structure, computed for your garden and finished when the garden has
        grown into it.
      </motion.p>

      {/* One filled action (the buyer path) + a quiet proof link (the engine), so both the
          person who wants to shape one and the person testing the claim have a next step. */}
      <motion.div
        variants={growLine}
        className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 origin-bottom will-change-transform"
      >
        <a
          href={routes.studio}
          className="rounded-full bg-paperVellum px-6 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-inkBlack shadow-lg transition-colors hover:bg-accentOlive focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paperVellum"
        >
          {CTA_PRIMARY_BUYER}
        </a>
        <a
          href={routes.engine}
          className="font-mono text-[12px] uppercase tracking-[0.14em] text-paperVellum/90 underline decoration-paperVellum/40 underline-offset-4 transition hover:decoration-paperVellum"
        >
          See how it works →
        </a>
      </motion.div>
    </motion.div>
  );
}

/** The beauty still, full-bleed. Framed 3:2 with sky headroom; object-bottom pins the
 *  image's bottom edge so short windows crop the disposable sky, not the foreground. */
function HeroStill() {
  return (
    <img
      src={HERO_STILL.src}
      alt=""
      className="absolute inset-0 h-full w-full object-cover object-bottom"
    />
  );
}

/** The copy sits in a lower-LEFT column so the middle + right of the image stay open. A
 *  soft dark scrim rises from the bottom-left corner so the cream copy reads over any
 *  part of the photo without darkening the whole frame. */
function CopyColumn({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-10 pt-40 md:px-10 md:pb-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/60 via-black/25 to-transparent"
      />
      <div className="relative mr-auto max-w-[34rem]">{children}</div>
    </div>
  );
}

/** The finished hero: the beauty still + copy. `animate` drives the one-time copy
 *  growth (browser reveal only); off on poster / reduced-motion. */
function StillHero({ animate }: { animate: boolean }) {
  // Latched once when the intro veil lifts (or immediately if the intro already played
  // this tab / animation is off): flips the copy growth on.
  const [show, setShow] = useState(!animate);
  const latch = useRef(!animate);

  useEffect(() => {
    if (!animate) return;
    const begin = () => {
      if (latch.current) return;
      latch.current = true;
      setShow(true);
    };
    let alreadyPlayed = false;
    try {
      alreadyPlayed = !!sessionStorage.getItem(SESSION_KEY);
    } catch {
      /* private mode: treat as not played -> wait for the intro */
    }
    if (alreadyPlayed) {
      begin();
      return;
    }
    window.addEventListener(INTRO_DONE_EVENT, begin, { once: true });
    return () => window.removeEventListener(INTRO_DONE_EVENT, begin);
  }, [animate]);

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-paperVellum text-inkBlack">
      <HeroStill />
      <CopyColumn>
        <HeroCopy orchestrate={animate} show={show} />
      </CopyColumn>
    </section>
  );
}

export function HeroReveal({ reduced }: { outputs: EngineOutputs; reduced: boolean }) {
  // Client-rendered SPA (createRoot, no hydration). On the server (tests) there is no
  // window -> poster (finished markup, copy present).
  const isBrowser = typeof window !== 'undefined';
  const mode = heroMode({ isBrowser, reduced });
  return <StillHero animate={mode === 'reveal'} />;
}
