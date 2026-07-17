/**
 * GongbiLab.tsx — the curation room for the painterly nonflowers engine, at
 * #/lab/gongbi. Not linked from the nav (like #/lab/botanical): a review surface,
 * not a destination.
 *
 * Purpose: commissions on the About page are PERMANENT seeds (see
 * src/pages/about/paintings.ts), so someone has to stand in front of the wall and
 * choose. Type a seed family, browse takes of both archetypes with their measured
 * stats printed underneath (the quality gate's own numbers — coverage/ink/chroma,
 * see src/engine/gongbi/quality.ts), and pin winners by copying the printed seed
 * into the ledger. The grid renders through the very same FanPainting slot the
 * About page hangs, so what you approve here is exactly what ships there.
 */
import { useMemo, useState } from 'react';
import { SplashHeader } from '../splash/SplashHeader';
import { Frame } from '../../ui/Frame';
import { FanPainting } from '../about/FanPainting';
import type { Commission } from '../about/paintings';

const COUNTS = [6, 12, 18] as const;
const KINDS = ['mixed', 'woody', 'herbal'] as const;

export function GongbiLab() {
  const [family, setFamily] = useState('bower/lab');
  const [count, setCount] = useState<(typeof COUNTS)[number]>(6);
  const [kinds, setKinds] = useState<(typeof KINDS)[number]>('mixed');

  const commissions = useMemo<Commission[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        seed: i === 0 ? family : `${family}-${i + 1}`,
        kind: kinds === 'mixed' ? (i % 2 === 0 ? 'woody' : 'herbal') : kinds,
        mode: 'mounted',
        alt: `Lab take ${i + 1} of seed family ${family}`,
      })),
    [family, count, kinds],
  );

  return (
    <div className="min-h-screen bg-paperVellum text-inkBlack">
      <SplashHeader measure="page" />
      <main className="pt-header">
        <Frame measure="page" className="py-16">
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-inkBlack/60">
            Gongbi lab — painterly nonflowers curation
          </p>
          <h1 className="mt-3 font-serifDisplay text-3xl font-semibold">Browse takes, pin winners.</h1>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.08em] text-inkBlack/70">
              Seed family
              <input
                value={family}
                onChange={(e) => setFamily(e.target.value)}
                spellCheck={false}
                className="border border-inkBlack/20 bg-transparent px-3 py-1.5 font-mono text-[13px] normal-case tracking-normal outline-none focus:border-inkBlack/50"
              />
            </label>
            <div className="flex items-center gap-1 font-mono text-[12px] uppercase tracking-[0.08em] text-inkBlack/70">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCount(c)}
                  className={`px-3 py-1.5 ${count === c ? 'bg-inkBlack text-paperVellum' : 'hover:bg-inkBlack/5'}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 font-mono text-[12px] uppercase tracking-[0.08em] text-inkBlack/70">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKinds(k)}
                  className={`px-3 py-1.5 ${kinds === k ? 'bg-inkBlack text-paperVellum' : 'hover:bg-inkBlack/5'}`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-3">
            {commissions.map((c) => (
              <FanPainting key={c.seed + c.kind} commission={c} size={340} eager showStats />
            ))}
          </div>
        </Frame>
      </main>
    </div>
  );
}
