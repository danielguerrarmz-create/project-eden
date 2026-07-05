/**
 * Navbar.tsx — the floating translucent pill.
 * Wordmark left (one constant, swapped when the name locks on the Day-3 call),
 * a "copy link" that puts the URL-encoded design on the clipboard (the demo's
 * only "send" mechanism, demo-spec §1), and a quiet "start over" right.
 */
import { useState } from 'react';
import { WORDMARK } from '../data/config';
import { useDesign, shareURL } from '../state/store';

export function Navbar() {
  const reset = useDesign((s) => s.reset);
  const params = useDesign((s) => s.params);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareURL(params));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be denied in odd embeds; the URL bar already has the link.
      window.prompt('copy this link', shareURL(params));
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 w-[min(920px,calc(100vw-1.5rem))]">
      <div className="flex items-center justify-between gap-4 rounded-full border border-line/80 bg-paper/80 px-5 py-2.5 shadow-[0_6px_24px_-12px_rgba(30,27,23,0.35)] backdrop-blur-md">
        {/* Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <Sprout />
          <span className="font-display text-[19px] font-semibold lowercase tracking-tight text-ink">
            {WORDMARK}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={copyLink}
            className="shrink-0 rounded-full border border-line bg-white/50 px-3.5 py-1.5 text-xs font-medium text-inkSoft transition hover:text-ink"
          >
            {copied ? 'copied ✓' : 'copy link to this design'}
          </button>
          <button onClick={reset} className="shrink-0 text-xs font-medium text-inkFaint transition hover:text-ink">
            start over
          </button>
        </div>
      </div>
    </div>
  );
}

function Sprout() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path d="M12 21V11" stroke="#5E6E2B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 12C12 8.5 9 6.5 5.5 6.5C5.5 10 8 12 12 12Z" fill="#7A8B3C" />
      <path d="M12 10.5C12 7.5 14.6 5 18 5C18 8.2 15.5 10.5 12 10.5Z" fill="#8ea060" />
      <circle cx="12" cy="21" r="1.1" fill="#E06A4E" />
    </svg>
  );
}
