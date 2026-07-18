import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { EnginePage } from './EnginePage';

/** Strip the <!-- --> markers React SSR injects between text and expressions. */
const clean = (html: string) => html.replace(/<!-- -->/g, '');

describe('EnginePage (the restored /engine walkthrough)', () => {
  const html = clean(renderToString(createElement(EnginePage)));

  it('renders the layperson four-beat walkthrough (rewritten 2026-07-17)', () => {
    // The arc: shape it -> real & buildable -> a plant grows into it -> keep it alive.
    expect(html).toContain('How it works');
    expect(html).toContain('a garden structure'); // hero H2 (the word "grow" is italicized, so it splits)
    expect(html).toContain('buy one off a shelf');
    expect(html).toContain('You shape a few simple things');
    expect(html).toContain('A plant grows into it');
    // the growth honesty note (the one caveat kept), and the close CTA into the studio
    expect(html).toContain('projection');
    expect(html).toContain('Shape your own Eden');
    // the old engineer-facing walkthrough and its jargon are GONE
    expect(html).not.toContain('The generative engine');
    expect(html).not.toContain('Solar geometry');
    expect(html).not.toContain('fabrication grammar');
    expect(html).not.toContain('density field');
  });

  it('wears the shared splash chrome (one floating SplashHeader, one nav)', () => {
    // The shared header, not the old bespoke one: wordmark + splash nav.
    expect(html).toContain('how it works');
    expect(html).toContain('about');
    expect(html).toContain('#/'); // home link
    expect(html).toContain('#/studio'); // the "engine" nav target
    // The old bespoke header strings are gone.
    expect(html).not.toContain('· the generative engine');
  });

  it('links to the direct-manipulation prototype', () => {
    expect(html).toContain('#/shape');
    expect(html).toContain('direct manipulation');
  });

  it('holds the house dash rule across the whole walkthrough', () => {
    expect(html).not.toMatch(/[—–]/);
  });
});
