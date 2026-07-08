/**
 * BowerMark.tsx — the mono-chrome company mark for documentation-layer chrome
 * (engine header, the Eden splash header): the Oculus company mark plus the
 * company name set lowercase in mono, matching the studio pill's lowercase
 * treatment so the two chromes read as one brand. The name is read from WORDMARK,
 * so a naming lock is a one-line change. Mono, quiet: it does not compete with the
 * hero's one display-serif moment.
 *
 * Company chrome uses the locked Oculus mark (2026-07-06); the studio configurator
 * (Eden-product usage) keeps the Sprout glyph.
 */
import { WORDMARK } from '../data/config';
import { OculusMark } from './OculusMark';

export function BowerMark({
  className = '',
  markSize = 16,
  nameClass = 'font-mono text-[11px] lowercase tracking-[0.14em]',
}: {
  className?: string;
  /** Oculus glyph size in px. */
  markSize?: number;
  /** Class string for the wordmark text (the intro re-measures `[data-wordmark]`). */
  nameClass?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <OculusMark size={markSize} />
      <span data-wordmark className={nameClass}>
        {WORDMARK}
      </span>
    </span>
  );
}
