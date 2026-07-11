import { describe, it, expect } from 'vitest';
import {
  ENGINE_NAME,
  CTA_PRIMARY_EVALUATOR,
  CTA_PRIMARY_BUYER,
  WORDMARK,
  PRODUCT,
} from './config';

const DASHES = /[—–]/; // em dash, en dash: never allowed in on-screen copy

describe('brand naming constants (chrome reads these, so a rename is one line)', () => {
  it('ENGINE_NAME is the lowercase generic until the naming call lands', () => {
    expect(ENGINE_NAME).toBe('the engine');
  });

  it('both primary CTA labels exist so the post-deadline swap is one line', () => {
    expect(CTA_PRIMARY_EVALUATOR).toBe('See how the engine works');
    expect(CTA_PRIMARY_BUYER).toBe('Shape your Eden');
  });

  it('keeps the confirmed company and product nouns', () => {
    expect(WORDMARK).toBe('Bower');
    expect(PRODUCT).toBe('Eden');
  });

  it('no naming or CTA constant carries an em/en dash', () => {
    for (const s of [ENGINE_NAME, CTA_PRIMARY_EVALUATOR, CTA_PRIMARY_BUYER, WORDMARK, PRODUCT]) {
      expect(s).not.toMatch(DASHES);
    }
  });
});
