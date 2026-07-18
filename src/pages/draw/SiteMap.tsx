/**
 * SiteMap.tsx — step 1: pick your property.
 *
 * A deliberately stylised aerial, not a map integration. It exists to make the
 * first move about a PLACE rather than a parameter: you are not configuring an
 * object, you are putting something in your garden. Three authored Austin lots
 * sit along a street; selecting one hands its polygon to `analyseSite`, and
 * every number that appears after this is computed from that geometry.
 *
 * DEMO SCOPE: `AUSTIN_PARCELS` is authored (see engine/site.ts). When a real
 * parcel service lands, only that constant changes.
 */
import { useMemo } from 'react';
import { AUSTIN_PARCELS, analyseSite, type Parcel } from '../../engine/site';

const PAD = 6; // metres of margin around the block
const LOT_GAP = 2.4; // metres between neighbouring lots

/** Lay the parcels out along a street, left to right, in shared plan metres. */
function useBlock() {
  return useMemo(() => {
    let cursorX = 0;
    const placed = AUSTIN_PARCELS.map((p) => {
      const w = Math.max(...p.lot.map((q) => q.x));
      const h = Math.max(...p.lot.map((q) => q.y));
      const originX = cursorX;
      cursorX += w + LOT_GAP;
      return { parcel: p, originX, w, h };
    });
    const width = cursorX - LOT_GAP;
    const height = Math.max(...placed.map((p) => p.h));
    return { placed, width, height };
  }, []);
}

const poly = (pts: { x: number; y: number }[], dx: number) =>
  pts.map((p) => `${p.x + dx},${p.y}`).join(' ');

export function SiteMap({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (p: Parcel) => void;
}) {
  const { placed, width, height } = useBlock();

  // Plan y grows north; SVG y grows down. Flip once, here, so every child can
  // think in plan metres and never worry about it again.
  const vb = `${-PAD} ${-PAD} ${width + PAD * 2} ${height + PAD * 2}`;

  return (
    <svg viewBox={vb} className="h-full w-full" style={{ transform: 'scaleY(-1)' }}>
      <defs>
        {/* A quiet ground texture — reads as aerial without pretending to be one. */}
        <pattern id="turf" width="1.6" height="1.6" patternUnits="userSpaceOnUse">
          <rect width="1.6" height="1.6" fill="#93a06a" />
          <circle cx="0.4" cy="0.5" r="0.5" fill="#8b9a61" />
          <circle cx="1.2" cy="1.1" r="0.42" fill="#9aa774" />
        </pattern>
        <pattern id="roof" width="0.9" height="0.9" patternUnits="userSpaceOnUse">
          <rect width="0.9" height="0.9" fill="#b9b2a4" />
          <path d="M0 0.9 L0.9 0" stroke="#ada596" strokeWidth="0.16" />
        </pattern>
      </defs>

      {/* Street across the front of the block */}
      <rect x={-PAD} y={-PAD} width={width + PAD * 2} height={PAD} fill="#cfc9bb" />
      <line
        x1={-PAD}
        y1={-PAD / 2}
        x2={width + PAD}
        y2={-PAD / 2}
        stroke="#efeade"
        strokeWidth="0.18"
        strokeDasharray="1.6 1.2"
      />

      {placed.map(({ parcel, originX, w, h }) => {
        const selected = parcel.id === selectedId;
        const a = analyseSite(parcel);
        return (
          <g
            key={parcel.id}
            onClick={() => onSelect(parcel)}
            className="cursor-pointer"
            style={{ opacity: selectedId && !selected ? 0.42 : 1, transition: 'opacity 220ms' }}
          >
            {/* Lot */}
            <rect x={originX} y={0} width={w} height={h} fill="url(#turf)" />
            <rect
              x={originX}
              y={0}
              width={w}
              height={h}
              fill="none"
              stroke={selected ? '#1b1b18' : '#6f6a5c'}
              strokeWidth={selected ? 0.34 : 0.14}
            />

            {/* The buildable rear yard, revealed on selection */}
            {selected && (
              <rect
                x={a.backyard.minX + originX}
                y={a.backyard.minY}
                width={a.backyard.maxX - a.backyard.minX}
                height={a.backyard.maxY - a.backyard.minY}
                fill="#e9e3d3"
                fillOpacity={0.5}
                stroke="#1b1b18"
                strokeWidth={0.12}
                strokeDasharray="0.7 0.5"
              />
            )}

            {/* House */}
            <polygon points={poly(parcel.house, originX)} fill="url(#roof)" stroke="#8f8879" strokeWidth={0.12} />

            {/* Trees */}
            {parcel.trees.map((t, i) => (
              <g key={i}>
                <circle
                  cx={t.at.x + originX}
                  cy={t.at.y}
                  r={t.canopyRadiusM}
                  fill={t.protected ? '#6f8248' : '#7d8e5b'}
                  fillOpacity={0.72}
                />
                {t.protected && selected && (
                  <circle
                    cx={t.at.x + originX}
                    cy={t.at.y}
                    r={t.canopyRadiusM}
                    fill="none"
                    stroke="#1b1b18"
                    strokeWidth={0.1}
                    strokeDasharray="0.4 0.35"
                  />
                )}
              </g>
            ))}

            {/* Where the engine thinks it goes */}
            {selected && a.placementRadiusM > 0 && (
              <>
                <circle
                  cx={a.placement.x + originX}
                  cy={a.placement.y}
                  r={a.placementRadiusM}
                  fill="#1b1b18"
                  fillOpacity={0.06}
                  stroke="#1b1b18"
                  strokeWidth={0.1}
                />
                <circle cx={a.placement.x + originX} cy={a.placement.y} r={0.28} fill="#1b1b18" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Address labels live outside the flipped SVG so the type isn't mirrored. */
export function SiteLabels({ selectedId }: { selectedId: string | null }) {
  const { placed, width } = useBlock();
  return (
    <div className="pointer-events-none absolute inset-0">
      {placed.map(({ parcel, originX, w }) => {
        const leftPct = ((originX + w / 2 + PAD) / (width + PAD * 2)) * 100;
        const selected = parcel.id === selectedId;
        return (
          <div
            key={parcel.id}
            className="absolute -translate-x-1/2 text-center"
            style={{ left: `${leftPct}%`, bottom: '1.5%', opacity: selectedId && !selected ? 0.4 : 1 }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-inkBlack/80">
              {parcel.address}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-inkBlack/45">
              {parcel.neighbourhood}
            </p>
          </div>
        );
      })}
    </div>
  );
}
