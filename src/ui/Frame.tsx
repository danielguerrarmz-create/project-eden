/**
 * Frame.tsx — the one content frame for the whole site.
 *
 * Every page's content, AND the header itself, sits in one of these. That is the point:
 * because the header is framed by the same rule as the content, its left edge IS the
 * content's left edge at every viewport width, so the chrome visibly frames the page
 * instead of floating free of it on a wide display.
 *
 * Three measures, named for what they hold rather than for a pixel count:
 *   read   — a reading column (splash sections, the commission sheet). Fixed: a measure
 *            that grows with the monitor stops being readable.
 *   page   — the editorial frame (the engine walkthrough). Fluid.
 *   canvas — a gallery or an instrument (About's project grid, the studio's rails), which
 *            genuinely want more width than a reading spread. Fluid.
 *
 * `page` and `canvas` are clamps (see index.css) tuned so they evaluate to the site's
 * legacy widths at a 1440px viewport, and only then start using the monitor. Nothing
 * shifts on the display the site was designed on.
 */
import type { ReactNode } from 'react';

export type Measure = 'read' | 'page' | 'canvas';

// The names deliberately avoid Tailwind's stock `max-w-prose` / `max-w-full`, which
// already mean something else. See the token block in index.css.
const MEASURE: Record<Measure, string> = {
  read: 'max-w-read',
  page: 'max-w-page',
  canvas: 'max-w-canvas',
};

export function Frame({
  measure = 'page',
  as: Tag = 'div',
  className = '',
  children,
}: {
  measure?: Measure;
  /** The element to render. A Frame is layout, so it should not force a semantic. */
  as?: 'div' | 'header' | 'section' | 'main' | 'footer' | 'nav';
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={`mx-auto w-full ${MEASURE[measure]} px-gutter ${className}`}>{children}</Tag>
  );
}
