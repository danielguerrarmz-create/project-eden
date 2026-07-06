import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { SplashPage } from './SplashPage';
import { EnginePage } from './EnginePage';

/** Strip the <!-- --> markers React SSR injects between text and expressions. */
const clean = (html: string) => html.replace(/<!-- -->/g, '');

describe('SplashPage', () => {
  const html = clean(renderToString(createElement(SplashPage)));

  it('renders live copy and diagrams without throwing', () => {
    expect(html).toContain('Commission a');
    expect(html).toContain('register interest');
    expect(html).toContain('See how the engine works');
    // live number from the hero annotation strip (fixed price)
    expect(html).toMatch(/fixed price £[\d,]+/);
    // svg diagrams present (hero + envelope + strut small multiples + becoming)
    expect((html.match(/<svg/g) || []).length).toBeGreaterThan(5);
  });

  it('honors the durationless constraint (no year label leaks)', () => {
    expect(html).not.toContain('Year 0');
    expect(html).not.toContain('just planted');
    expect(html).toContain('just placed');
    expect(html).toContain('always becoming, never finished');
    expect(html.toLowerCase()).not.toMatch(/year (one|two|three|3|1|0)/);
  });

  it('uses the Eden product name and the Bower brand coherently', () => {
    expect(html).toContain('Eden'); // the product a client commissions
    expect(html).toContain('Bower'); // the company wordmark (hero header)
  });

  it('teaches the noun stack in the header chrome', () => {
    expect(html).toContain('(the pavilion)');
    expect(html).toContain('the engine');
    expect(html).toContain('the studio');
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
    const html = clean(renderToString(createElement(SplashPage)));
    expect(html).not.toMatch(/[—–]/);
  });

  it('renders no em/en dashes anywhere in the engine output', () => {
    const html = clean(renderToString(createElement(EnginePage)));
    expect(html).not.toMatch(/[—–]/);
    // the product CTA reads Eden, the brand chrome reads Bower
    expect(html).toContain('Shape your own Eden');
    expect(html).toContain('Bower');
  });
});
