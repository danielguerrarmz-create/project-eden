/**
 * connectors.test.ts — the steel's explode data, pinned to its instances.
 *
 * `buildSteel` emits steel from a dozen call sites inside one node loop, and
 * backfills each instance's owner at the loop BOUNDARY rather than at each push.
 * That is the right call — threading an owner through every site would be a
 * dozen chances to miss one — but it rests on one invariant: the owner arrays
 * stay exactly parallel to the instance arrays.
 *
 * If someone adds a push OUTSIDE the node loop, or returns early from inside it,
 * the arrays desync and every instance after that point inherits the wrong
 * node's normal and delay. On screen that is a bolt flying off in the wrong
 * direction, at the wrong time, and it would be very hard to trace back here.
 * These are cheap and they close that.
 */
import { describe, expect, it } from 'vitest';
import { runEngine } from '../engine';
import type { DesignParams } from '../engine/types';
import { buildSteel } from './connectors';

const base: DesignParams = {
  footprintM2: 15,
  riseM: 2.3,
  strutSpacingM: 0.55,
  apertureDeg: 90,
  jointSystem: 'hub',
  speciesId: 'clematis',
  year: 0,
};

describe.each(['hub', 'lamella'] as const)('buildSteel (%s system)', (jointSystem) => {
  const g = runEngine({ ...base, jointSystem }).geometry;
  const steel = buildSteel(g);
  const nodeIds = new Set(g.nodes.map((n) => n.id));

  it('emits some steel at all', () => {
    expect(steel.boxes.length + steel.cylinders.length).toBeGreaterThan(0);
  });

  it('keeps an owner for EVERY instance, exactly parallel', () => {
    // The invariant the loop-boundary backfill rests on.
    expect(steel.boxOwners).toHaveLength(steel.boxes.length);
    expect(steel.cylOwners).toHaveLength(steel.cylinders.length);
  });

  it('tags a role for EVERY cylinder, exactly parallel', () => {
    // The instanceColor split rests on this the way the explode rests on owners.
    // A drift here is a bolt rendered galvanized (or a drum rendered dark).
    expect(steel.cylRoles).toHaveLength(steel.cylinders.length);
    for (const r of steel.cylRoles) expect(['structural', 'fastener']).toContain(r);
  });

  it('has both structural and fastener cylinders (bolts exist, drums or stubs exist)', () => {
    // Every design has bolts (hub) or through-bolts (lamella) plus ground-screw
    // stubs, so at least one fastener; and ground stubs put steel at the feet.
    expect(steel.cylRoles).toContain('fastener');
  });

  it('owns every instance from a real node', () => {
    for (const o of [...steel.boxOwners, ...steel.cylOwners]) {
      expect(nodeIds.has(o.nodeId)).toBe(true);
    }
  });

  it('gives every instance a usable direction and a usable start order', () => {
    // A zero-length normal is a piece that explodes nowhere; a NaN v is a piece
    // that never starts. Both render as "one bit of steel stayed behind".
    for (const o of [...steel.boxOwners, ...steel.cylOwners]) {
      expect(Math.hypot(...o.normal)).toBeCloseTo(1, 3);
      expect(Number.isFinite(o.v)).toBe(true);
      expect(o.v).toBeGreaterThanOrEqual(0);
      expect(o.v).toBeLessThanOrEqual(1);
    }
  });

  it('spreads across the cascade rather than popping at once', () => {
    // If every owner had the same v the explode would be a single pop, not a
    // sequence — and the assembly-order claim would be decoration.
    const vs = [...steel.boxOwners, ...steel.cylOwners].map((o) => o.v);
    expect(Math.min(...vs)).toBeLessThan(0.2);
    expect(Math.max(...vs) - Math.min(...vs)).toBeGreaterThan(0.5);
  });
});

describe('the two systems put steel in genuinely different places', () => {
  it('has NO steel at the crown in the lamella system, and plenty in the hub', () => {
    // Measured, and it is structure rather than a bug: the lamella weave's
    // crown is woven timber blanks closing on shared mitres — there is no hub
    // there to build. The hub system puts 100+ instances on the same nodes.
    //
    // Pinned because it looks exactly like a bug from the outside ("the steel
    // stops at 0.75"), and because it means the explode's LAST beat is timber
    // only in the lamella system. That is correct and someone will wonder.
    const crownSteel = (jointSystem: 'hub' | 'lamella') => {
      const g = runEngine({ ...base, jointSystem }).geometry;
      const s = buildSteel(g);
      const crown = new Set(g.nodes.filter((n) => n.kind === 'crown').map((n) => n.id));
      return [...s.boxOwners, ...s.cylOwners].filter((o) => crown.has(o.nodeId)).length;
    };
    expect(crownSteel('lamella')).toBe(0);
    expect(crownSteel('hub')).toBeGreaterThan(0);
  });
});

describe('CanopyNode.v', () => {
  const g = runEngine(base).geometry;

  it('runs 0 at the eave/ground to 1 at the crown, like Member.v', () => {
    const crown = g.nodes.filter((n) => n.kind === 'crown');
    const ground = g.nodes.filter((n) => n.kind === 'ground' || n.kind === 'eave');
    expect(crown.length).toBeGreaterThan(0);
    expect(ground.length).toBeGreaterThan(0);
    for (const n of crown) expect(n.v).toBeCloseTo(1, 6);
    for (const n of ground) expect(n.v).toBeCloseTo(0, 6);
  });

  it('agrees with the members arriving at it', () => {
    // A node and its members must share a sense of where they are, or a hub
    // leaves before the struts it holds.
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    for (const m of g.members) {
      const a = byId.get(m.nodeStartId);
      const b = byId.get(m.nodeEndId);
      if (!a || !b) continue;
      // The member's v sits between its two nodes' v (inclusive, with slack for
      // the splice midpoints that share their ring's value).
      expect(m.v).toBeGreaterThanOrEqual(Math.min(a.v, b.v) - 1e-6);
      expect(m.v).toBeLessThanOrEqual(Math.max(a.v, b.v) + 1e-6);
    }
  });

  it('is finite for every node, splices included', () => {
    for (const n of g.nodes) expect(Number.isFinite(n.v)).toBe(true);
  });
});
