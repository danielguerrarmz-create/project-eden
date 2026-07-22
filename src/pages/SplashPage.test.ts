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
    // Everything above the "What Bower is" band is the pitch (now just the hero). It used to
    // split on `id="how-it-works"`, which was removed with the engine's public surface on
    // 2026-07-21; the eyebrow marks the same boundary and is real copy, not an anchor.
    const pitch = html.split('What Bower is')[0];
    expect(pitch).not.toBe(html); // the split point must actually exist, or this asserts nothing
    expect(pitch).not.toContain('Year 0');
    expect(pitch).not.toContain('just planted');
    expect(pitch.toLowerCase()).not.toMatch(/year (one|two|three|3|1|0)/);
  });

  it('uses the Eden product name and the Bower brand coherently', () => {
    expect(html).toContain('Eden'); // the product a client commissions
    expect(html).toContain('Bower'); // the company wordmark (hero header)
  });

  it('carries the global nav, which is now about and nothing else', () => {
    // 2026-07-21: "how it works" (#/engine) and "studio" left the nav when the engine came
    // off the live site. The SplashHeader renders NAV_LINKS twice (the inline pill and the
    // mobile dropdown), so a leaked entry would show up here twice over.
    expect(html).toContain('about');
    expect(html).toContain('href="#/about"');
    expect(html).not.toContain('>studio<');
    expect(html).not.toContain('>how it works<');
    expect(html).not.toContain('(the pavilion)');
  });

  it('links nowhere except #/about and its own #register anchor', () => {
    // THE HOME MUST NOT DEAD-END INTO A HIDDEN ROUTE. Every engine destination is dev-only
    // now, so any href into one would 'work' locally and land on the splash in production,
    // which is a link that silently lies. Sweep the rendered hrefs rather than naming the
    // ones we happened to remember removing. Anchors only: the nav pill's lens filter
    // carries an `feImage href="data:image/svg+xml…"`, which is a bump map, not a destination.
    const hrefs = [...html.matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(2); // the logo, the nav's about, the close's door
    for (const href of hrefs) {
      expect(['#/', '#/about', '#register']).toContain(href);
    }
  });

  it('states what Bower is, without pointing at the engine', () => {
    // The first content band explains the product in one pass. Its `#how-it-works` anchor
    // and its "see the full engine walkthrough" link were removed on 2026-07-21; the band
    // and its photograph stay, because they say what Bower is without showing the tool.
    expect(html).toContain('What Bower is');
    expect(html).toContain('grammar computes the');
    expect(html).not.toContain('id="how-it-works"');
    expect(html).not.toContain('See the full engine walkthrough');
    // the sun-path / growth-phases detail is NOT on the home page
    expect(html).not.toContain('Solar geometry');
  });

  it('closes on the register, with the studio door gone', () => {
    expect(html).toContain('Who is behind this');
    expect(html).not.toContain('Commission one');
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
