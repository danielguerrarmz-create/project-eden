import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { HeroReveal, heroMode } from './HeroReveal';
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
  jointSystem: ENVELOPE.jointSystem,
};

describe('heroMode (fallback decision, 3D reveal tabled)', () => {
  it('server (no window) -> poster (finished markup, copy present)', () => {
    expect(heroMode({ isBrowser: false, reduced: false })).toBe('poster');
  });

  it('reduced motion -> static (finished still, no growth)', () => {
    expect(heroMode({ isBrowser: true, reduced: true })).toBe('static');
  });

  it('browser + motion allowed -> reveal (copy grows in after the intro veil lifts)', () => {
    expect(heroMode({ isBrowser: true, reduced: false })).toBe('reveal');
  });
});

describe('HeroReveal SSR (finished still + copy visible)', () => {
  const outputs = runEngine(defaults);
  const html = renderToString(createElement(HeroReveal, { outputs, reduced: false }));

  it('renders the outcome copy with the product word "Eden", over the beauty still', () => {
    expect(html).toContain('Grow a living');
    expect(html).toContain('Eden');
    expect(html).toContain('in your garden');
    expect(html).toContain('computed for your garden');
    // The hero now carries one filled buyer CTA + a quiet proof link.
    expect(html).toContain('Shape your Eden');
    expect(html).toContain('See how it works');
    // The 3D reveal is tabled: no three.js canvas is referenced by the hero.
    expect(html).not.toContain('<canvas');
    // The nav lives in the global fixed SplashHeader, not the hero SSR.
    expect(html).not.toContain('the studio');
    // Removed CTAs / stats must not reappear.
    expect(html).not.toContain('Register interest');
    expect(html).not.toContain('See how the engine works');
    expect(html).not.toContain('priced live');
    // The beauty still is present as the hero background.
    expect(html).toContain('/hero/');
    // No em/en dashes in the hero copy (house rule).
    expect(html).not.toMatch(/[—–]/);
  });
});
