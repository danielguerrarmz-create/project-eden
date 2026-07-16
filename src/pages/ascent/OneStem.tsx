/**
 * OneStem.tsx — the five-year story as a single climbing vine.
 *
 * The dated ledger (INSCRIPTION, 2021 → 2026) hangs off one ink-voice garland
 * grown up the left rail: the reader climbs, the vine climbs with them. The
 * path is derived FROM the layout — each entry's measured centre becomes a
 * station on the vine, so the growth follows the typography, not the other way
 * round (the whole point of the garland composer). Root at the bottom (2021,
 * a bud), leaves and blossoms at the years going up. The pigment crown is NOT
 * here — it waits at the summit (see Summit.tsx); this section stays one ink.
 *
 * Inside the ascent, sections are met from their BOTTOM edge, so the entry
 * list renders flex-col-reverse: DOM (and reader) order 2021 → 2026, visual
 * order bottom → top. The vine strip repaints when the measured rail height
 * changes bucket (64px quanta, so resize noise doesn't thrash the cache).
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { requestGarland } from '../../engine/gongbi/painter';
import type { GarlandStation } from '../../engine/gongbi/garland';
import { Frame } from '../../ui/Frame';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { INK_BLUE } from '../about/CrossPathsTimeline';
import { TEAM_CODA } from '../about/projects';
import { INSCRIPTION, INSCRIPTION_CODA } from '../scroll/paintings';

/** The vine's permanent seed — one species from root to crown, forever. */
const VINE_SEED = 'bower/one-stem';
/** CSS width of the vine rail; the strip paints at RAIL_W × DPR_CAP. */
const RAIL_W = 150;
const DPR_CAP = 1.5;

/** The vine's designed meander: a visible S in rail space, root (t=0) at bottom. */
function vineX(t: number): number {
  return RAIL_W * (0.5 + 0.3 * Math.sin(t * 7.4 + 0.6) * (0.55 + 0.45 * Math.sin(t * 2.1 + 1.7)));
}

export function OneStem() {
  const reduced = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sketchPath, setSketchPath] = useState<string | null>(null);
  const [painted, setPainted] = useState(false);

  useLayoutEffect(() => {
    const rail = railRef.current;
    const list = listRef.current;
    if (!rail || !list) return;

    let cancelled = false;
    const grow = () => {
      const railBox = rail.getBoundingClientRect();
      const H = Math.max(320, Math.round(railBox.height / 64) * 64);
      const k = DPR_CAP;

      // Stations from the measured entry centres: t runs 0 at the rail's
      // bottom (2021) to 1 at its top (2026). Years get organs; the gaps get
      // interstitial leaves so the vine reads planted, not beaded.
      const items = Array.from(list.querySelectorAll('li'));
      const ts: number[] = items.map((li) => {
        const b = li.getBoundingClientRect();
        const centre = b.top + b.height / 2 - railBox.top;
        return Math.min(1, Math.max(0, 1 - centre / railBox.height));
      });
      const stations: GarlandStation[] = [];
      ts.forEach((t, i) => {
        stations.push({ t, organ: i === 0 ? 'bud' : 'bloom' });
        if (i > 0) {
          // Two leaves in each between-years gap so the vine reads planted.
          const prev = ts[i - 1];
          stations.push({ t: prev + (t - prev) * 0.36, organ: 'leaf' });
          stations.push({ t: prev + (t - prev) * 0.7, organ: 'leaf' });
        }
      });
      stations.push({ t: Math.max(0, (ts[0] ?? 0.05) - 0.04), organ: 'leaf' });
      stations.push({ t: Math.min(1, (ts[ts.length - 1] ?? 0.9) + 0.05), organ: 'leaf' });

      // Root-first path in strip px (strip y grows downward; t=0 = bottom).
      const N = 28;
      const path: Array<[number, number]> = Array.from({ length: N }, (_, i) => {
        const t = i / (N - 1);
        return [vineX(t) * k, (H - 10 - t * (H - 24)) * k];
      });

      // The underdrawing: the same path as a plain ink line, visible instantly.
      setSketchPath(
        path.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(x / k).toFixed(1)} ${(y / k).toFixed(1)}`).join(' '),
      );

      requestGarland({
        seed: VINE_SEED,
        voice: 'ink',
        width: Math.round(RAIL_W * k),
        height: Math.round(H * k),
        path,
        stations,
        scale: 1.35,
        rootWidth: 9,
      }).then((bitmap) => {
        const c = canvasRef.current;
        if (cancelled || !c) return;
        c.width = bitmap.width;
        c.height = bitmap.height;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(bitmap, 0, 0);
        setPainted(true);
      }, (err: unknown) => console.error('one-stem garland failed:', err));
    };

    grow();
    const ro = new ResizeObserver(() => grow());
    ro.observe(rail);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, []);

  const fade = reduced ? '' : 'transition-opacity duration-[900ms]';

  return (
    <Frame measure="read" as="section">
      {/* Met from below: the kicker sits at the section's bottom, before the climb. */}
      <div className="grid grid-cols-[minmax(0,150px)_1fr] gap-6 md:gap-10">
        <div ref={railRef} className="relative" aria-hidden>
          {sketchPath && (
            <svg
              className={`absolute inset-0 h-full w-full ${fade}`}
              style={{ opacity: painted ? 0 : 0.5 }}
              viewBox={`0 0 ${RAIL_W} ${railRef.current?.getBoundingClientRect().height ?? 600}`}
              preserveAspectRatio="none"
            >
              <path d={sketchPath} fill="none" stroke={INK_BLUE} strokeWidth="1.5" />
            </svg>
          )}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 h-full w-full ${fade}`}
            style={{ opacity: painted ? 1 : 0 }}
          />
        </div>
        <div className="flex flex-col-reverse">
          {/* Reader (climbing) meets: kicker, then 2021 … 2026, then the coda. */}
          <p className="mt-0 font-mono text-[12px] uppercase tracking-[0.14em] text-inkBlack/60">
            {TEAM_CODA.kicker}.
          </p>
          <ol className="mb-10 flex flex-col-reverse gap-11" ref={listRef}>
            {INSCRIPTION.map((entry) => (
              <li key={entry.year} className="grid grid-cols-[4.5rem_1fr] items-baseline gap-5">
                <span className="font-mono text-2xl tabular-nums" style={{ color: INK_BLUE }}>
                  {entry.year}
                </span>
                <p className="max-w-[54ch] text-[17px] leading-relaxed opacity-90">{entry.text}</p>
              </li>
            ))}
          </ol>
          <p className="mb-12 max-w-[50ch] font-serifDisplay text-[19px] italic leading-relaxed text-inkBlack/80">
            {INSCRIPTION_CODA}
          </p>
        </div>
      </div>
    </Frame>
  );
}
