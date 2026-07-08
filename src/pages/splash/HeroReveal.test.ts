import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { HeroReveal, heroMode, HERO_THRESHOLDS } from './HeroReveal';
import { runEngine } from '../../engine';
import { ENVELOPE } from '../../data/config';
import type { DesignParams } from '../../engine/types';

const defaults: DesignParams = {
  footprintM2: ENVELOPE.footprintM2.default,
  riseM: ENVELOPE.riseM.default,
  strutSpacingM: ENVELOPE.strutSpacingM.default,
  apertureDeg: ENVELOPE.apertureDeg.default,
  speciesId: 'lonicera',
  year: 0,
};

describe('heroMode (fallback decision)', () => {
  it('server (no window) -> poster (no canvas, copy present)', () => {
    expect(heroMode({ isBrowser: false, webgl: true, reduced: false })).toBe('poster');
  });

  it('no WebGL -> poster', () => {
    expect(heroMode({ isBrowser: true, webgl: false, reduced: false })).toBe('poster');
  });

  it('reduced motion + WebGL -> final render, static (no scrub)', () => {
    expect(heroMode({ isBrowser: true, webgl: true, reduced: true })).toBe('staticRender');
  });

  it('browser + WebGL + motion allowed -> the scrubbed hero (no poster flash)', () => {
    expect(heroMode({ isBrowser: true, webgl: true, reduced: false })).toBe('scrub');
  });
});

describe('HERO_THRESHOLDS are ordered and in range', () => {
  it('each stage runs forward and the beats do not regress', () => {
    const ranges = [
      HERO_THRESHOLDS.OCULUS_OUT,
      HERO_THRESHOLDS.CANVAS_IN,
      HERO_THRESHOLDS.TILT,
      HERO_THRESHOLDS.RESOLVE,
      HERO_THRESHOLDS.COPY_IN,
      HERO_THRESHOLDS.EDEN_IN,
      HERO_THRESHOLDS.STILL_IN,
    ];
    for (const [a, b] of ranges) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
      expect(a).toBeLessThan(b);
    }
    // Choreography order: canvas in -> tilt -> resolve -> copy in (at the end of the
    // reveal, over the finished render), with the cursive Eden writing on a beat later,
    // and the beauty still cross-fading in once the render has resolved.
    expect(HERO_THRESHOLDS.CANVAS_IN[1]).toBeLessThanOrEqual(HERO_THRESHOLDS.TILT[0]);
    expect(HERO_THRESHOLDS.TILT[1]).toBeLessThanOrEqual(HERO_THRESHOLDS.RESOLVE[0]);
    expect(HERO_THRESHOLDS.RESOLVE[1]).toBeLessThanOrEqual(HERO_THRESHOLDS.COPY_IN[0]);
    expect(HERO_THRESHOLDS.COPY_IN[0]).toBeLessThanOrEqual(HERO_THRESHOLDS.EDEN_IN[0]);
    expect(HERO_THRESHOLDS.RESOLVE[1]).toBeLessThanOrEqual(HERO_THRESHOLDS.STILL_IN[0]);
  });
});

describe('HeroReveal SSR (poster fallback = final state visible)', () => {
  const outputs = runEngine(defaults);
  const html = renderToString(createElement(HeroReveal, { outputs, reduced: false }));

  it('renders the poster hero with the outcome copy visible and no canvas', () => {
    // New stripped hero: a 7-word outcome headline with the cursive product word
    // "Eden", plus a single mission line. No eyebrow, no CTAs, no stats strip.
    expect(html).toContain('Grow a living');
    expect(html).toContain('Eden');
    expect(html).toContain('in your garden');
    expect(html).toContain('Rewilding gardens through architecture anyone can build');
    // The nav moved to the global fixed SplashHeader, so it is NOT in the hero SSR.
    expect(html).not.toContain('the studio');
    // The removed CTAs / stats must not reappear.
    expect(html).not.toContain('Register interest');
    expect(html).not.toContain('See how the engine works');
    expect(html).not.toContain('priced live');
    // the flat Oculus mark stands in for the render (poster): real <circle> mark
    expect((html.match(/<circle/g) || []).length).toBeGreaterThanOrEqual(8);
    // no em/en dashes in the hero copy (house rule)
    expect(html).not.toMatch(/[—–]/);
  });
});
