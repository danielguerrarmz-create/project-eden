/**
 * joints.ts — node graph -> connector + fastener schedule.
 *
 * This is the half of the BOM the old model simply didn't have: a pavilion is
 * timber pieces AND the steel that joins them, and a kit that ships without a
 * counted bolt is not a kit. Every quantity here is derived from the explicit
 * node graph (geometry.nodes), never estimated.
 *
 * Joint details per system: docs/FABRICATION.md §2–§3, §5. Unit rates live in
 * PRICING.hardwareGBP keyed by each item's `id`.
 *
 * TODO(roadmap): third branch for 'timberJoinery' (5-axis all-timber joints,
 * FABRICATION.md §9) — it consumes the same node graph, emits dowels + glue
 * instead of steel.
 *
 * PURE. Input: geometry. Output: HardwareItem[].
 */
import { FOUNDATION, JOINTS } from '../data/config';
import type { CanopyGeometry, HardwareItem } from './types';

export function computeHardware(g: CanopyGeometry): HardwareItem[] {
  const lamella = g.params.jointSystem === 'lamella';
  const legs = g.params.footStrategy === 'legs';

  const nodeCount = (kind: string) => g.nodes.filter((n) => n.kind === kind).length;
  const pieceCount = (kind: string) => g.pieces.filter((p) => p.kind === kind).length;

  const crownN = nodeCount('crown');
  const interiorN = nodeCount('interior');
  const eaveN = nodeCount('eave');
  const groundN = nodeCount('ground');
  const spliceN = nodeCount('splice'); // mid-bay beam splices: fish plate, no hub
  const legCount = legs ? g.feetCount : 0;
  // Every ring node (crown + eave, grounded or not) fixes a blank: 2 bolts each.
  const ringNodeN = 2 * g.spokeCount;

  const items: HardwareItem[] = [];

  if (!lamella) {
    // HUB SYSTEM — one welded steel hub per canopy node; struts slot onto
    // fins with 2 bolts per end (JOINTS.hub).
    const canopyHubs = crownN + interiorN + eaveN; // grid ground nodes handled below; leg bases get post shoes
    items.push({
      id: 'hub',
      label: 'steel node hubs — S355 6 mm laser-cut fins, welded, HDG (each unique, angles from this design)',
      qty: canopyHubs,
    });
    if (!legs && groundN > 0) {
      items.push({
        id: 'hubGroundShoe',
        label: 'ground-shoe hubs — node hub + 200×200×8 base plate (sweep touchdowns)',
        qty: groundN,
      });
    }
    const strutEndBolts = pieceCount('strut') * 2 * JOINTS.hub.boltsPerStrutEnd;
    const blankBolts = ringNodeN * 2;
    const legBolts = legCount * 4;
    items.push({
      id: 'boltSet',
      label: `bolt sets — ${JOINTS.hub.boltSpec}`,
      qty: strutEndBolts + blankBolts + legBolts,
    });
    if (spliceN > 0) {
      items.push({
        id: 'fishPlate',
        label: 'splice fish-plate pairs — 4 mm HDG + M10 sets (mid-bay eave splices)',
        qty: spliceN,
      });
    }
  } else {
    // LAMELLA SYSTEM — one through-bolt per interior node (the Zollinger
    // joint), one per ring node fixing lamella ends to the blanks, fish
    // plates at blank splices.
    const nodeBolts = interiorN * JOINTS.lamella.boltsPerNode;
    const edgeBolts = ringNodeN;
    const legBolts = legCount * 4;
    items.push({
      id: 'boltSet',
      label: `bolt sets — ${JOINTS.lamella.boltSpec}`,
      qty: nodeBolts + edgeBolts + legBolts,
    });
    // Where the sheet cut limit forced a lamella down to single bays (foot
    // sweep zone), no piece runs continuous through the node — that joint
    // needs a fish-plate splice instead of the plain single bolt.
    const pieceOf = new Map(g.members.map((m) => [m.id, m.pieceId]));
    const typeOf = new Map(g.members.map((m) => [m.id, m.type]));
    let splitWeaveNodes = 0;
    for (const n of g.nodes) {
      if (n.kind !== 'interior') continue;
      const diagrid = n.memberIds.filter((id) => {
        const t = typeOf.get(id);
        return t === 'lamella' || t === 'foot';
      });
      const distinctPieces = new Set(diagrid.map((id) => pieceOf.get(id)));
      if (diagrid.length === 4 && distinctPieces.size === 4) splitWeaveNodes++;
    }
    items.push({
      id: 'fishPlate',
      label: 'splice fish-plate pairs — 4 mm HDG + M10 sets (blank + mid-bay splices, split-weave nodes)',
      qty: pieceCount('eaveBlank') + pieceCount('crownBlank') + splitWeaveNodes + spliceN,
    });
    if (!legs && groundN > 0) {
      items.push({
        id: 'plateGroundShoe',
        label: 'bent-plate ground shoes (sweep touchdowns)',
        qty: groundN,
      });
    }
  }

  if (legs) {
    items.push(
      {
        id: 'legHeadPlate',
        label: 'leg-head T-plates — 6 mm HDG (paired posts sandwich the plate)',
        qty: legCount,
      },
      { id: 'postShoe', label: 'adjustable HDG post shoes (leg bases)', qty: legCount },
    );
  }

  items.push({
    id: 'groundScrew',
    label: `${FOUNDATION.groundScrewSpec} — supplied + driven, no concrete`,
    qty: g.groundScrewCount,
  });

  return items;
}
