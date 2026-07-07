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

  it('restores the page chrome (nav back to home and the studio)', () => {
    expect(html).toContain('the generative engine');
    expect(html).toContain('the studio');
    expect(html).toContain('#/');
  });

  it('holds the house dash rule across the whole walkthrough', () => {
    expect(html).not.toMatch(/[—–]/);
  });
});
