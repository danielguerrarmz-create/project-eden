import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { SplashPage } from './SplashPage';

/** Strip the <!-- --> markers React SSR injects between text and expressions. */
const clean = (html: string) => html.replace(/<!-- -->/g, '');

describe('SplashPage', () => {
  const html = clean(renderToString(createElement(SplashPage)));

  it('renders live copy and the two product photographs without throwing', () => {
    // New stripped hero: outcome headline + mission line (the cursive "Eden" word).
    expect(html).toContain('Grow a living');
    expect(html).toContain('computed for your garden');
    // hero's single filled buyer CTA
    expect(html).toContain('Shape your Eden');
    // the register section's form label is still present lower on the page
    expect(html).toContain('register interest');
    // the hero's old CTAs / stats strip are gone
    expect(html).not.toContain('See how the engine works');
    expect(html).not.toContain('this shape, priced live');
    // REDUCED 2026-07-17: the two middle bands are now product photographs, not
    // engine diagrams. Both must be present and each must carry alt text.
    expect(html).toContain('/assets/product/pavilion-exterior-garden.webp');
    expect(html).toContain('/assets/product/pavilion-oculus-interior.webp');
    expect(html).toMatch(/alt="[^"]*oculus[^"]*"/);
  });

  it('was greatly reduced: the becoming, habitat, and engine-diagram bands are gone', () => {
    // These sections and their diagrams were cut on 2026-07-17 (Daniel). The depth the
    // pipeline / envelope / strut-field diagrams held now lives at /engine, reached by the
    // in-page link. Pinning their ABSENCE is the "say what you cut" discipline: if a later
    // edit restores one of these, this is where it announces itself.
    expect(html).not.toContain('A structure that keeps'); // "keeps becoming" band
    expect(html).not.toContain('habitat built in');
    expect(html).not.toContain('pollinator cells'); // ecology facts row
    expect(html).not.toMatch(/footprint [\d.]+ m²/); // envelope annotation strip
    expect(html).not.toContain('What stays the same'); // objection strip
  });

  it('honors the durationless constraint in the marketing pitch (no year label leaks)', () => {
    // The durationless rule governs the MARKETING pitch: it must not promise a timeline.
    // Everything above the #how-it-works band is the pitch (now just the hero).
    const pitch = html.split('id="how-it-works"')[0];
    expect(pitch).not.toContain('Year 0');
    expect(pitch).not.toContain('just planted');
    expect(pitch.toLowerCase()).not.toMatch(/year (one|two|three|3|1|0)/);
  });

  it('uses the Eden product name and the Bower brand coherently', () => {
    expect(html).toContain('Eden'); // the product a client commissions
    expect(html).toContain('Bower'); // the company wordmark (hero header)
  });

  it('carries the global nav: how it works, studio, about', () => {
    // The fixed SplashHeader teaches "how it works" (the /engine walkthrough page),
    // "studio" (the configurator, its label now matching its destination), and "about".
    expect(html).toContain('how it works');
    expect(html).toContain('about');
    // "studio" nav label now points honestly at the studio route (was mislabeled "engine").
    expect(html).toContain('>studio<');
    expect(html).toContain('href="#/studio"');
    expect(html).not.toContain('(the pavilion)');
  });

  it('states what Bower is and links out to the full engine walkthrough', () => {
    // The first content band ("What Bower is") explains the product in one pass and defers
    // the mechanics to /engine. The #how-it-works anchor stays here so the nav resolves.
    expect(html).toContain('id="how-it-works"');
    expect(html).toContain('What Bower is');
    expect(html).toContain('grammar computes the');
    // the deep-link out to the full walkthrough (the /engine route)
    expect(html).toContain('See the full engine walkthrough');
    expect(html).toContain('#/engine');
    // the sun-path / growth-phases detail is NOT on the home page
    expect(html).not.toContain('Solar geometry');
  });

  it('teaches the commission ritual with live production figures', () => {
    expect(html).toContain('What actually'); // the second band's heading
    expect(html).toContain('after you shape it');
    expect(html).toContain('Shape it in the studio');
    expect(html).toContain('Plant, and let it start becoming');
    // component count + weeks, reused from the commission-sheet source of truth
    expect(html).toMatch(/~\d+ components/);
    expect(html).toMatch(/~\d+ wks/);
  });
});

describe('house dash rule (no em/en dashes in rendered copy)', () => {
  it('renders no em/en dashes anywhere in the splash output', () => {
    const html = clean(renderToString(createElement(SplashPage)));
    expect(html).not.toMatch(/[—–]/);
  });
});
