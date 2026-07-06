/**
 * BowerMark.tsx — the unified company wordmark for the documentation-layer chrome
 * (splash header, engine header): the sprout glyph plus the company name set
 * lowercase in mono, matching the studio pill's lowercase treatment so the two
 * chromes read as one brand. The name is read from WORDMARK, so a naming lock is
 * a one-line change. Mono, quiet: it does not compete with the hero's one Bodoni
 * moment.
 */
import { WORDMARK } from '../data/config';
import { Sprout } from './Sprout';

export function BowerMark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Sprout size={16} />
      <span className="font-mono text-[11px] lowercase tracking-[0.14em]">{WORDMARK}</span>
    </span>
  );
}
