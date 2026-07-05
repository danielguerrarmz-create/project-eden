/**
 * PlotMapper.tsx — the top-down site mapper, rebuilt in the hairline language.
 *
 * A resizable rectangle the user drags by its edge handles to set width x depth
 * in metres, plus a rotatable north marker (now the accent-olive highlight) on a
 * compass ring. It reuses the Engine page's own DimensionLine / ExtensionLine /
 * AccentMark primitives so the plot mapper is a literal instance of the same
 * drawing vocabulary, not just a similarly-colored rectangle. Outputs feed the
 * engine: plot dimensions cap the Eden footprint, north drives the sun-path.
 *
 * On mount and on discrete plot changes (a sample plot), the rectangle draws
 * itself in (stroke-dashoffset); during an active drag it updates immediately.
 * Reduced motion is handled by the app-wide media query that neutralises it.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useDesign } from '../state/store';
import { DimensionLine, ExtensionLine, AccentMark, INK, InkProvider } from '../pages/engine/hairline';

const PX_PER_M = 20;
const W = 480;
const H = 440;
const CX = W / 2;
const CY = H / 2;
const RING_R = 190;

const MIN_W = 3;
const MAX_W = 16;
const MIN_D = 3;
const MAX_D = 14;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

type DragKind = 'w-left' | 'w-right' | 'd-top' | 'd-bottom' | 'north' | null;

export function PlotMapper() {
  const plot = useDesign((s) => s.plot);
  const setPlot = useDesign((s) => s.setPlot);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<DragKind>(null);

  // Re-key the rectangle to replay its draw-in on mount + discrete changes only.
  const [drawTick, setDrawTick] = useState(0);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return; // mount draw-in already plays via the initial key
    }
    if (!drag.current) setDrawTick((t) => t + 1);
  }, [plot.widthM, plot.depthM]);

  const halfW = (plot.widthM * PX_PER_M) / 2;
  const halfD = (plot.depthM * PX_PER_M) / 2;
  const perim = 4 * (halfW + halfD);

  const northRad = (plot.northDeg * Math.PI) / 180;
  const knobX = CX + RING_R * Math.sin(northRad);
  const knobY = CY - RING_R * Math.cos(northRad);
  const labelX = CX + (RING_R + 18) * Math.sin(northRad);
  const labelY = CY - (RING_R + 18) * Math.cos(northRad);

  function localPoint(e: React.PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return { x: CX, y: CY };
    const rect = svg.getBoundingClientRect();
    const sx = W / rect.width;
    const sy = H / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const { x, y } = localPoint(e);
    switch (drag.current) {
      case 'w-left':
      case 'w-right': {
        const half = Math.abs(x - CX);
        setPlot({ widthM: clamp(Math.round(((half * 2) / PX_PER_M) * 2) / 2, MIN_W, MAX_W) });
        break;
      }
      case 'd-top':
      case 'd-bottom': {
        const half = Math.abs(y - CY);
        setPlot({ depthM: clamp(Math.round(((half * 2) / PX_PER_M) * 2) / 2, MIN_D, MAX_D) });
        break;
      }
      case 'north': {
        const dx = x - CX;
        const dy = y - CY;
        let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
        deg = ((Math.round(deg / 5) * 5) % 360 + 360) % 360;
        setPlot({ northDeg: deg });
        break;
      }
    }
  }

  function start(kind: DragKind) {
    return (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = kind;
    };
  }

  function end(e: React.PointerEvent) {
    drag.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  /** Keyboard path: every handle is focusable; arrows nudge its dimension. */
  function nudge(kind: Exclude<DragKind, null>) {
    return (e: React.KeyboardEvent) => {
      const plus = e.key === 'ArrowRight' || e.key === 'ArrowUp';
      const minus = e.key === 'ArrowLeft' || e.key === 'ArrowDown';
      if (!plus && !minus) return;
      e.preventDefault();
      const dir = plus ? 1 : -1;
      switch (kind) {
        case 'w-left':
        case 'w-right':
          setPlot({ widthM: clamp(plot.widthM + 0.5 * dir, MIN_W, MAX_W) });
          break;
        case 'd-top':
        case 'd-bottom':
          setPlot({ depthM: clamp(plot.depthM + 0.5 * dir, MIN_D, MAX_D) });
          break;
        case 'north':
          setPlot({ northDeg: ((plot.northDeg + 5 * dir) % 360 + 360) % 360 });
          break;
      }
    };
  }

  const areaM2 = (plot.widthM * plot.depthM).toFixed(0);
  const top = CY - halfD;
  const bottom = CY + halfD;
  const left = CX - halfW;
  const right = CX + halfW;

  const drawStyle: CSSProperties = {
    ['--plot-perim' as string]: `${perim}`,
    strokeDasharray: perim,
    animation: 'plot-draw var(--dur-slow) var(--ease-out) both',
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[480px] select-none touch-none"
        style={{ aspectRatio: `${W} / ${H}` }}
        aria-label="plot mapper: drag or focus a handle and use arrow keys to size the plot and set north"
      >
        {/* Compass ring */}
        <circle cx={CX} cy={CY} r={RING_R} fill="none" stroke="#DED8CB" strokeWidth={1.5} strokeDasharray="3 6" />

        {/* Plot rectangle: near-neutral fill, ink boundary, drawn in on change */}
        <rect
          key={drawTick}
          x={left}
          y={top}
          width={halfW * 2}
          height={halfD * 2}
          rx={3}
          fill="rgba(23,22,15,0.03)"
          stroke="#17160F"
          strokeWidth={1.75}
          style={drawStyle}
        />

        {/* Interior 1m grid (secondary linework) */}
        <GridTicks halfW={halfW} halfD={halfD} />

        {/* Hairline dimensioning, reusing the Engine page primitives */}
        <InkProvider value={INK.inkBlack}>
          <ExtensionLine x={left} y={top} length={22} angle={-90} />
          <ExtensionLine x={right} y={top} length={22} angle={-90} />
          <DimensionLine
            x1={left}
            y1={top - 20}
            x2={right}
            y2={top - 20}
            label={`${plot.widthM.toFixed(1)}M`}
            fontSize={13}
            tick={5}
            labelOffset={-12}
          />
          <ExtensionLine x={right} y={top} length={24} angle={0} />
          <ExtensionLine x={right} y={bottom} length={24} angle={0} />
          <DimensionLine
            x1={right + 22}
            y1={top}
            x2={right + 22}
            y2={bottom}
            label={`${plot.depthM.toFixed(1)}M`}
            fontSize={13}
            tick={5}
            labelOffset={-16}
          />
        </InkProvider>

        {/* Edge handles — draggable AND keyboard-focusable (arrows nudge 0.5 m) */}
        <EdgeHandle x={left} y={CY} cursor="ew-resize" onDown={start('w-left')} onMove={onMove} onUp={end}
          onKey={nudge('w-left')} label="plot width, left edge" value={plot.widthM} min={MIN_W} max={MAX_W} unit="metres" />
        <EdgeHandle x={right} y={CY} cursor="ew-resize" onDown={start('w-right')} onMove={onMove} onUp={end}
          onKey={nudge('w-right')} label="plot width, right edge" value={plot.widthM} min={MIN_W} max={MAX_W} unit="metres" />
        <EdgeHandle x={CX} y={top} cursor="ns-resize" onDown={start('d-top')} onMove={onMove} onUp={end}
          onKey={nudge('d-top')} label="plot depth, top edge" value={plot.depthM} min={MIN_D} max={MAX_D} unit="metres" />
        <EdgeHandle x={CX} y={bottom} cursor="ns-resize" onDown={start('d-bottom')} onMove={onMove} onUp={end}
          onKey={nudge('d-bottom')} label="plot depth, bottom edge" value={plot.depthM} min={MIN_D} max={MAX_D} unit="metres" />

        {/* North: line + draggable knob, the one accent-olive highlight */}
        <line x1={CX} y1={CY} x2={knobX} y2={knobY} stroke="#ACC13A" strokeWidth={2} />
        <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={700} fill="#17160F">
          N
        </text>
        <AccentMark cx={knobX} cy={knobY} r={7} />
        <circle
          cx={knobX}
          cy={knobY}
          r={11}
          fill="#ACC13A"
          stroke="#FBF9F3"
          strokeWidth={3}
          style={{ cursor: 'grab' }}
          onPointerDown={start('north')}
          onPointerMove={onMove}
          onPointerUp={end}
          tabIndex={0}
          role="slider"
          aria-label="north orientation"
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={plot.northDeg}
          aria-valuetext={`${plot.northDeg} degrees`}
          onKeyDown={nudge('north')}
        />
        <circle cx={CX} cy={CY} r={3} fill="#17160F" />
      </svg>

      <div className="flex items-center gap-6 text-sm">
        <Readout label="width" value={`${plot.widthM.toFixed(1)} m`} />
        <Readout label="depth" value={`${plot.depthM.toFixed(1)} m`} />
        <Readout label="area" value={`${areaM2} m²`} />
        <Readout label="orientation" value={`${plot.northDeg.toFixed(0)}°`} />
      </div>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-base font-semibold text-inkBlack tabular-nums">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-inkBlack/45">{label}</div>
    </div>
  );
}

function EdgeHandle({
  x,
  y,
  cursor,
  onDown,
  onMove,
  onUp,
  onKey,
  label,
  value,
  min,
  max,
  unit,
}: {
  x: number;
  y: number;
  cursor: string;
  onDown: (e: React.PointerEvent) => void;
  onMove: (e: React.PointerEvent) => void;
  onUp: (e: React.PointerEvent) => void;
  onKey: (e: React.KeyboardEvent) => void;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <g
      style={{ cursor }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      tabIndex={0}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value.toFixed(1)} ${unit}`}
      onKeyDown={onKey}
    >
      <circle cx={x} cy={y} r={14} fill="transparent" />
      <circle cx={x} cy={y} r={7} fill="#FBF9F3" stroke="#17160F" strokeWidth={2.5} />
    </g>
  );
}

function GridTicks({ halfW, halfD }: { halfW: number; halfD: number }) {
  const lines: React.ReactNode[] = [];
  for (let px = PX_PER_M; px < halfW; px += PX_PER_M) {
    lines.push(<line key={`vx${px}`} x1={CX + px} y1={CY - halfD} x2={CX + px} y2={CY + halfD} stroke="#17160F" strokeOpacity={0.1} />);
    lines.push(<line key={`vx-${px}`} x1={CX - px} y1={CY - halfD} x2={CX - px} y2={CY + halfD} stroke="#17160F" strokeOpacity={0.1} />);
  }
  for (let px = PX_PER_M; px < halfD; px += PX_PER_M) {
    lines.push(<line key={`hy${px}`} x1={CX - halfW} y1={CY + px} x2={CX + halfW} y2={CY + px} stroke="#17160F" strokeOpacity={0.1} />);
    lines.push(<line key={`hy-${px}`} x1={CX - halfW} y1={CY - px} x2={CX + halfW} y2={CY - px} stroke="#17160F" strokeOpacity={0.1} />);
  }
  return <g>{lines}</g>;
}
