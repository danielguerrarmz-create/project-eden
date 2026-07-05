/**
 * vitest.config.ts — pure-function unit tests only.
 *
 * The engine (src/engine) is a pipeline of pure functions with no React or
 * three.js, so tests run in the default node environment with no jsdom, no
 * plugins, no DOM. Fast on purpose. Nothing here renders a component.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
