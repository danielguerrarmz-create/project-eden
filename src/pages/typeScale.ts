/**
 * typeScale.ts — the shared documentation-layer type scale.
 *
 * Extracted from EnginePage so the splash landing and the engine explainer
 * import the identical scale instead of drifting private copies. Zero visual
 * change: these are the exact class strings the Engine page shipped with.
 *
 * H1  = the one Bodoni Moda pull-quote moment per page (font-quote).
 * H2  = every other heading (font-serifDisplay, Source Serif 4).
 * BODY = the reading-column paragraph default.
 */
export const H1 =
  'font-quote font-bold leading-[0.98] tracking-[-0.02em] text-[clamp(2.75rem,6vw,5.5rem)]';
export const H2 =
  'font-serifDisplay font-semibold leading-[1.04] tracking-[-0.01em] text-[clamp(1.75rem,3.5vw,3rem)]';
export const BODY = 'mt-6 max-w-[60ch] text-[17px] leading-relaxed opacity-90';
