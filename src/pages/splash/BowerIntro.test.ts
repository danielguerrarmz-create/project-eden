import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { BowerIntro, shouldPlayIntro } from './BowerIntro';

describe('shouldPlayIntro (run-once + reduced-motion guard)', () => {
  it('plays only on a fresh, non-reduced-motion tab', () => {
    expect(shouldPlayIntro(false, false)).toBe(true);
  });

  it('never plays under reduced motion', () => {
    expect(shouldPlayIntro(true, false)).toBe(false);
    expect(shouldPlayIntro(true, true)).toBe(false);
  });

  it('never replays once it has run this tab', () => {
    expect(shouldPlayIntro(false, true)).toBe(false);
  });
});

describe('BowerIntro SSR', () => {
  it('renders nothing on the server (activates client-side only)', () => {
    const html = renderToString(createElement(BowerIntro));
    expect(html).toBe('');
  });
});
