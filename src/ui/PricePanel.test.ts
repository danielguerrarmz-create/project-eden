/**
 * PricePanel.test.ts — the honesty pass, pinned at the SURFACE.
 *
 * priceCopy.test.ts pins the sentences. This pins the fact that the sentences
 * are actually ON the panels, and that the claims they replaced are actually
 * OFF them. Those are different failures: someone can leave priceCopy.ts
 * untouched, stop importing it, and hand-type "fixed" back into the JSX.
 *
 * These components are React but not three.js, so they render to a string in
 * the bare node environment this suite runs in (see vitest.config.ts), the same
 * way SplashPage.test.ts already does it. No DOM needed.
 */
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, beforeAll, vi } from 'vitest';

/**
 * The sheet returns null until `commissionOpen`, and it cannot simply be
 * toggled: zustand serves React's getServerSnapshot during renderToString,
 * which is the store's INITIAL state, so any setState before the render is
 * invisible to it. Hence a module mock that reads the real initial state and
 * flips the one flag. Every consumer in this file's graph (the sheet, the
 * panel, ReserveCTA inside it) then sees the same store.
 */
vi.mock('../state/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../state/store')>();
  const opened = { ...actual.useDesign.getState(), commissionOpen: true };
  return { ...actual, useDesign: <T,>(select: (s: typeof opened) => T): T => select(opened) };
});

const { CommissionSheet } = await import('./CommissionSheet');
const { PricePanel } = await import('./PricePanel');

/** Strip the <!-- --> markers React SSR injects between text and expressions. */
const clean = (html: string) => html.replace(/<!-- -->/g, '');

/**
 * Just the words a human sees. Tags go, so Tailwind's `class="fixed inset-0"`
 * cannot be mistaken for the CLAIM "fixed" — which is the only reason the test
 * below can afford to be as blunt as it is.
 */
const visibleText = (html: string) => html.replace(/<[^>]*>/g, ' ').toLowerCase();

describe('the commissioning surfaces do not claim a price nobody has quoted', () => {
  let panel = '';
  let sheet = '';

  beforeAll(() => {
    panel = clean(renderToString(createElement(PricePanel)));
    sheet = clean(renderToString(createElement(CommissionSheet)));
  });

  it('renders both surfaces without throwing', () => {
    expect(panel.length).toBeGreaterThan(0);
    expect(sheet.length).toBeGreaterThan(0);
  });

  it('does not use the word "fixed" anywhere a client can read it', () => {
    // The blunt version, and the one that earns its keep. The phrase-by-phrase
    // test below only catches the claims someone thought to list; this caught
    // two nobody had: pricing.ts was emitting the line label "Margin &
    // fixed-price guarantee" with the note "this is what makes the figure
    // fixed", rendering straight into the build-up under a panel that had just
    // finished admitting the figure is not fixed.
    for (const html of [panel, sheet]) {
      expect(visibleText(html)).not.toContain('fixed');
    }
  });

  it('never says the price is fixed, on either surface', () => {
    // The exact strings this pass removed. "YOUR PRICE, FIXED" was the panel's
    // headline and "fixed" was the sheet's hero badge, both over a figure built
    // from placeholder rates.
    for (const html of [panel, sheet]) {
      expect(html.toLowerCase()).not.toContain('your price, fixed');
      expect(html.toLowerCase()).not.toContain('fixed total');
      expect(html.toLowerCase()).not.toContain('one figure, held');
      expect(html.toLowerCase()).not.toContain('one figure, guaranteed');
    }
  });

  it('never promises the figure is a commitment', () => {
    // The single strongest claim in the demo, and the one with the least behind
    // it: "the number is a commitment, not an estimate".
    expect(sheet.toLowerCase()).not.toContain('commitment, not an estimate');
    for (const html of [panel, sheet]) {
      expect(html.toLowerCase()).not.toContain('guaranteed');
    }
  });

  it('leads with the stated commission floor on both', () => {
    // Was `£75k to £150k` this morning. Daniel superseded that ladder himself
    // on 2026-07-17: £150k is the FLOOR now, not the ceiling. The assertion
    // moved because the FACT moved.
    for (const html of [panel, sheet]) {
      expect(html).toContain('from £150k');
      expect(html.toLowerCase()).toContain('indicative');
      expect(html.toLowerCase()).toContain('pre-quote');
    }
  });

  it('surfaces stewardship on both, which the demo never mentioned before', () => {
    // Recurring revenue that exists BECAUSE the thing is alive. It was invisible
    // until 2026-07-17 despite being the most on-thesis number in the model.
    for (const html of [panel, sheet]) {
      expect(html.toLowerCase()).toContain('stewardship');
      expect(html).toContain('6 to 10%');
    }
  });

  it('keeps the computed build-up, and keeps its admission next to it', () => {
    // Honesty about the figure must not cost the evidence. The build-up is the
    // credible part; it just is not the price.
    for (const html of [panel, sheet]) {
      expect(html.toLowerCase()).toContain('placeholder');
      expect(html.toLowerCase()).toContain('not the commission price');
    }
  });

  it('does not offer to hold a price on the button', () => {
    // ReserveCTA renders inside the sheet. "Hold this design · £15,200" offered
    // to hold a figure that does not exist yet.
    expect(sheet).toContain('Hold this design');
    expect(sheet).not.toMatch(/Hold this design\s*·\s*£/);
  });
});
