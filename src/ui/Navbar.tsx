/**
 * Navbar.tsx — the floating studio pill.
 * Wordmark left (one constant, swapped when the name locks on the Day-3 call),
 * a "copy link" that puts the URL-encoded design on the clipboard (the demo's
 * only "send" mechanism, demo-spec §1), and a quiet "start over" right.
 *
 * 2026-07-10 chrome unify: restyled into the site's documentation-layer language
 * (hairline glass pill, mono wordmark + labels, inkBlack). The Sprout stays as the
 * Eden product glyph; only the styling changed. `copyLink` / `reset` are untouched.
 */
import { useState } from 'react';
import { WORDMARK } from '../data/config';
import { routes } from '../routing';
import { useDesign, shareURL } from '../state/store';
import { Sprout } from './Sprout';

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
    <div className="fixed left-1/2 top-4 z-30 w-[min(920px,calc(100vw-1.5rem))] -translate-x-1/2">
      <div className="nav-pill flex items-center justify-between gap-4 px-5 py-2.5">
        {/* Wordmark links home, with quiet exits so the studio is never a dead end. */}
        <div className="flex items-center gap-4">
          <a href={routes.home} className="flex shrink-0 items-center gap-2 text-inkBlack" aria-label="Bower, home">
            <Sprout />
            <span className="font-mono text-[19px] font-semibold lowercase tracking-[0.06em]">{WORDMARK}</span>
          </a>
          <nav className="hidden items-center gap-3 sm:flex">
            <a
              href={routes.engine}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/45 transition-colors hover:text-inkBlack"
            >
              how it works
            </a>
            <a
              href={routes.about}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/45 transition-colors hover:text-inkBlack"
            >
              about
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={copyLink}
            className="shrink-0 rounded-full border border-inkBlack/15 bg-white/50 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/70 transition-colors hover:text-inkBlack"
          >
            {copied ? 'copied ✓' : 'copy link'}
          </button>
          <button
            onClick={reset}
            className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/45 transition-colors hover:text-inkBlack"
          >
            start over
          </button>
        </div>
      </div>
    </div>
  );
}
