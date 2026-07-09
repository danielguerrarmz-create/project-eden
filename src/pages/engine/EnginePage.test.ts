import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { EnginePage } from './EnginePage';

/** Strip the <!-- --> markers React SSR injects between text and expressions. */
const clean = (html: string) => html.replace(/<!-- -->/g, '');

describe('EnginePage (the restored /engine walkthrough)', () => {
  const html = clean(renderToString(createElement(EnginePage)));

  it('renders the full six-section HowItWorks verbatim', () => {
    // sec 1 + 2 (the condensed home only keeps a folded version of these)
    expect(html).toContain('The generative engine');
    expect(html).toContain('not chosen from a catalogue');
    // sec 3 + 5: the detail demoted off the home page lives here
    expect(html).toContain('Solar geometry');
    expect(html).toContain('projection');
    // sec 6 close CTA back into the studio
    expect(html).toContain('Shape your own Eden');
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
