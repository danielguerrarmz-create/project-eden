/**
 * OculusMark.tsx — the Bower company mark, "Oculus" (locked 2026-07-06).
 *
 * Eight overlapping circles of radius 30, their centers evenly spaced on a ring
 * of radius 15 about the viewBox center (50,50): the plan of a bower seen from
 * within, a rose window, an iris, an oculus, all at once. Drawn as real <circle>
 * elements (not an innerHTML string) so it composes, tree-shakes, and inherits
 * ink via `currentColor`. The optional accent lights ONE circle in accent-olive,
 * the same house rule the diagrams follow: olive marks where life attaches, never
 * decoration. Reserve it for the living state (app icon, avatar); plain ink is the
 * default everywhere in chrome.
 *
 * Centers + geometry are exact per the locked spec; do not eyeball-adjust them.
 */

/** The eight circle centers on the radius-15 ring about (50,50). Locked.
 *  Exported so the About-page seed can reuse the exact geometry (its faint backdrop is this
 *  mark, scaled up) instead of re-deriving the numbers by eye. */
export const CENTERS: ReadonlyArray<readonly [number, number]> = [
  [65, 50],
  [60.61, 60.61],
  [50, 65],
  [39.39, 60.61],
  [35, 50],
  [39.39, 39.39],
  [50, 35],
  [60.61, 39.39],
];

/** The single accent circle when `accent` is on (index 1), in accent-olive. */
const ACCENT_INDEX = 1;
const ACCENT_OLIVE = '#ACC13A';

export function OculusMark({
  size = 40,
  accent = false,
  className = '',
}: {
  size?: number;
  accent?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <g stroke="currentColor" strokeWidth={2.8} fill="none" strokeLinecap="round">
        {CENTERS.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={30}
            stroke={accent && i === ACCENT_INDEX ? ACCENT_OLIVE : undefined}
          />
        ))}
      </g>
    </svg>
  );
}
