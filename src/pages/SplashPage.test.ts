import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { SplashPage } from './SplashPage';

/** Strip the <!-- --> markers React SSR injects between text and expressions. */
const clean = (html: string) => html.replace(/<!-- -->/g, '');

describe('SplashPage', () => {
  const html = clean(renderToString(createElement(SplashPage)));

  it('renders live copy and diagrams without throwing', () => {
    // New stripped hero: outcome headline + mission line (the cursive "Eden" word).
    expect(html).toContain('Grow a living');
    expect(html).toContain('Rewilding gardens through architecture anyone can build');
    // the register section's form label is still present lower on the page
    expect(html).toContain('register interest');
    // the hero's old CTAs / stats strip are gone
    expect(html).not.toContain('See how the engine works');
    expect(html).not.toContain('this shape, priced live');
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
    expect(pitch).toContain('A structure that keeps');
    expect(pitch.toLowerCase()).not.toMatch(/year (one|two|three|3|1|0)/);
  });

  it('uses the Eden product name and the Bower brand coherently', () => {
    expect(html).toContain('Eden'); // the product a client commissions
    expect(html).toContain('Bower'); // the company wordmark (hero header)
  });

  it('carries the global nav: how it works, engine, about', () => {
    // The fixed SplashHeader teaches "how it works" (an anchor), "engine" (the tool,
    // renamed from "the studio"), and "about" (empty placeholder page).
    expect(html).toContain('how it works');
    expect(html).toContain('about');
    // "engine" nav label (renamed from "the studio"), pointing at the studio route
    expect(html).toContain('>engine<');
    expect(html).toContain('href="#/studio"');
    expect(html).not.toContain('(the pavilion)');
  });

  it('carries a condensed engine section anchored #how-it-works', () => {
    // The home carries only the condensed engine section: pipeline mechanics + a
    // honesty coda. The full six-section walkthrough lives at the /engine route.
    expect(html).toContain('id="how-it-works"');
    expect(html).toContain('a grammar computes the');
    // honesty coda (eyebrow removed in the simplification pass, prose kept)
    expect(html).toContain('honest rules of thumb');
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
