import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { SplashPage } from './SplashPage';

/** Strip the <!-- --> markers React SSR injects between text and expressions. */
const clean = (html: string) => html.replace(/<!-- -->/g, '');

describe('SplashPage', () => {
  const html = clean(renderToString(createElement(SplashPage)));

  it('renders live copy and diagrams without throwing', () => {
    expect(html).toContain('Commission a');
    expect(html).toContain('register interest');
    expect(html).toContain('See how the engine works');
    // live number from the Engine section's envelope annotation strip
    expect(html).toMatch(/footprint [\d.]+ m²/);
    // svg diagrams present (hero + becoming + pipeline + envelope + strut)
    expect((html.match(/<svg/g) || []).length).toBeGreaterThan(5);
  });

  it('honors the durationless constraint in the marketing pitch (no year label leaks)', () => {
    // The durationless rule governs the MARKETING pitch (the becoming diagram must
    // not promise a timeline), not the honest engine explainer, which deliberately
    // says "year three is a projection, and the page says so". So we assert against
    // the pitch portion of the page: everything above the #how-it-works band.
    const pitch = html.split('id="how-it-works"')[0];
    expect(pitch).not.toContain('Year 0');
    expect(pitch).not.toContain('just planted');
    expect(pitch).toContain('just placed');
    expect(pitch).toContain('always becoming, never finished');
    expect(pitch.toLowerCase()).not.toMatch(/year (one|two|three|3|1|0)/);
  });

  it('uses the Eden product name and the Bower brand coherently', () => {
    expect(html).toContain('Eden'); // the product a client commissions
    expect(html).toContain('Bower'); // the company wordmark (hero header)
  });

  it('teaches the two-surface noun stack in the header chrome', () => {
    // The site collapsed from three surfaces to two: the engine explainer is now
    // an in-page band, so the nav teaches "how it works" (an anchor) and "the
    // studio" (the tool), with no separate "the engine" route link.
    expect(html).toContain('how it works');
    expect(html).toContain('the studio');
    expect(html).not.toContain('(the pavilion)');
  });

  it('carries a condensed engine section anchored #how-it-works', () => {
    // The home carries only the condensed engine section: pipeline mechanics + a
    // honesty coda. The full six-section walkthrough lives at the /engine route.
    expect(html).toContain('id="how-it-works"');
    expect(html).toContain('What the engine actually does');
    expect(html).toContain('A grammar that computes');
    expect(html).toContain('What is real and what is a rule of thumb');
    // the deep-link out to the full walkthrough (the restored /engine route)
    expect(html).toContain('See the full engine walkthrough');
    expect(html).toContain('#/engine');
    // the sun-path / growth-phases detail is NOT on the home page anymore
    expect(html).not.toContain('Solar geometry');
    expect(html).not.toContain('Shape your own Eden');
  });

  it('teaches the commission ritual with live production figures', () => {
    expect(html).toContain('Shape it in the studio');
    expect(html).toContain('Plant, and let it start becoming');
    // component count + weeks, reused from the commission-sheet source of truth
    expect(html).toMatch(/~\d+ components/);
    expect(html).toMatch(/~\d+ wks/);
  });

  it('handles objections: what stays the same and the PD height fact', () => {
    expect(html).toContain('your garden designer');
    expect(html).toContain('a computed armature for it to climb');
    expect(html).toContain('permitted development in the UK');
  });
});

describe('house dash rule (no em/en dashes in rendered copy)', () => {
  it('renders no em/en dashes anywhere in the splash output', () => {
    // This now also covers the folded-in engine explainer copy, since the whole
    // home (pitch + how-it-works band + close) renders from this one tree.
    const html = clean(renderToString(createElement(SplashPage)));
    expect(html).not.toMatch(/[—–]/);
  });
});
