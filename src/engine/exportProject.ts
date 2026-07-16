/**
 * exportProject.ts — take everything with you.
 *
 * Two exports, deliberately separate:
 *
 *   PROJECT  — the whole state of the thing: the site it sits on, the lines
 *              drawn, what the engine read, and every downstream number
 *              (components, sheets, price, build plan). If it is on screen, it
 *              is in here. This is the "give me my data" export.
 *
 *   DRAWING  — ONLY the lines and the site they were drawn on. Small, stable,
 *              and versioned, because this is the one that has to survive a
 *              round trip: today it exports, and the same shape is what a
 *              future import reads back. Keeping it separate from the project
 *              dump means the import contract is a handful of fields rather
 *              than the entire engine output, which would ossify every type
 *              downstream the moment anyone shipped an importer.
 *
 * Pure. Callers own the download.
 */
import type { Drawing, Nudge, ReadDrawing } from './fromDrawing';
import type { SiteAnalysis } from './site';
import type { EngineOutputs } from './types';

/** Bump when the DRAWING shape changes in a way an importer must notice. */
export const DRAWING_FORMAT_VERSION = 1;

export interface DrawingExport {
  format: 'bower.eden.drawing';
  version: number;
  /** Which parcel the lines were drawn on; enough to restore the context. */
  site: { parcelId: string; address: string } | null;
  /** The lines, in plan metres about the placement centre. */
  spines: Drawing['spines'];
  outline?: Drawing['outline'];
  crownPullM: number;
}

export interface ProjectExport {
  format: 'bower.eden.project';
  version: number;
  drawing: DrawingExport;
  site: {
    parcelId: string;
    address: string;
    neighbourhood: string;
    backyardAreaM2: number;
    placementRadiusM: number;
    reasons: string[];
    warnings: string[];
  } | null;
  /** What the engine READ out of the lines, and what it decided. */
  read: { params: ReadDrawing['params']; footBearingsDeg: number[]; drawnAreaM2: number; nudges: Nudge[] };
  /** The buildable result. Summarised, not a mesh dump — this is a spec, not a model. */
  build: {
    feetCount: number;
    ringCount: number;
    memberCount: number;
    pieceCount: number;
    groundScrewCount: number;
    maxComponentLengthM: number;
  };
  components: EngineOutputs['components'];
  nesting: EngineOutputs['nesting'];
  price: EngineOutputs['price'];
  buildPlan: EngineOutputs['buildPlan'];
  ecology: EngineOutputs['ecology'];
  species: { id: string; common: string; latin: string };
}

export function buildDrawingExport(
  drawing: Drawing,
  crownPullM: number,
  site: SiteAnalysis | null,
): DrawingExport {
  return {
    format: 'bower.eden.drawing',
    version: DRAWING_FORMAT_VERSION,
    site: site ? { parcelId: site.parcel.id, address: site.parcel.address } : null,
    spines: drawing.spines,
    ...(drawing.outline && drawing.outline.length > 0 ? { outline: drawing.outline } : {}),
    crownPullM,
  };
}

export function buildProjectExport(
  drawing: Drawing,
  crownPullM: number,
  site: SiteAnalysis | null,
  read: ReadDrawing,
  outputs: EngineOutputs,
): ProjectExport {
  const g = outputs.geometry;
  return {
    format: 'bower.eden.project',
    version: DRAWING_FORMAT_VERSION,
    drawing: buildDrawingExport(drawing, crownPullM, site),
    site: site
      ? {
          parcelId: site.parcel.id,
          address: site.parcel.address,
          neighbourhood: site.parcel.neighbourhood,
          backyardAreaM2: Number(site.backyardAreaM2.toFixed(1)),
          placementRadiusM: Number(site.placementRadiusM.toFixed(2)),
          reasons: site.reasons,
          warnings: site.warnings,
        }
      : null,
    read: {
      params: read.params,
      footBearingsDeg: read.footBearingsDeg,
      drawnAreaM2: Number(read.drawnAreaM2.toFixed(2)),
      nudges: read.nudges,
    },
    build: {
      feetCount: g.feetCount,
      ringCount: g.ringCount,
      memberCount: g.members.length,
      pieceCount: g.pieces.length,
      groundScrewCount: g.groundScrewCount,
      maxComponentLengthM: Number(g.maxComponentLengthM.toFixed(3)),
    },
    components: outputs.components,
    nesting: outputs.nesting,
    price: outputs.price,
    buildPlan: outputs.buildPlan,
    ecology: outputs.ecology,
    species: { id: outputs.species.id, common: outputs.species.common, latin: outputs.species.latin },
  };
}

/**
 * Read a DrawingExport back. Tolerant on purpose: a file a person kept for six
 * months should open, so anything missing falls back rather than throwing.
 * Returns null only when this clearly isn't one of ours.
 */
export function parseDrawingExport(json: unknown): { drawing: Drawing; crownPullM: number } | null {
  if (typeof json !== 'object' || json === null) return null;
  const j = json as Partial<DrawingExport>;
  if (j.format !== 'bower.eden.drawing') return null;
  if (!Array.isArray(j.spines)) return null;
  const okPt = (p: unknown) =>
    typeof p === 'object' && p !== null &&
    Number.isFinite((p as { x: unknown }).x) && Number.isFinite((p as { y: unknown }).y);
  const spines = j.spines.filter((s) => s && okPt(s.a) && okPt(s.b));
  return {
    drawing: {
      spines,
      ...(Array.isArray(j.outline) && j.outline.every(okPt) ? { outline: j.outline } : {}),
    },
    crownPullM: Number.isFinite(j.crownPullM) ? (j.crownPullM as number) : 0,
  };
}

/** A filename someone can find again in six months. */
export function exportFilename(kind: 'project' | 'drawing', site: SiteAnalysis | null): string {
  const where = site ? site.parcel.id : 'unsited';
  return `eden-${where}-${kind}.json`;
}
