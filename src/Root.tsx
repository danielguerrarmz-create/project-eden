/**
 * Root.tsx — top-level route switch.
 *
 * Bower is one company with one product (Eden), so the company home and the Eden
 * product page are one combined landing. The home carries a condensed engine
 * section (anchored `#how-it-works`); the full generative-engine walkthrough lives
 * at the standalone `#/engine` route for whoever wants the detail.
 *
 * `#/`       -> the combined Bower + Eden landing (the splash home, with the
 *               condensed engine section at `#how-it-works`).
 * `#/engine` -> the full six-section engine walkthrough (EnginePage chrome).
 * `#/studio` -> the single-page studio (the configurator, untouched component).
 * anything else -> the splash landing (fallback, so a stray hash never dead-ends
 * and the splash's in-page `#how-it-works` / `#register` anchors keep resolving).
 */
import App from './App';
import { EnginePage } from './pages/engine/EnginePage';
import { SplashPage } from './pages/SplashPage';
import { useRoute } from './routing';

export function Root() {
  const route = useRoute();
  if (route === '/studio') return <App />;
  if (route === '/engine') return <EnginePage />;
  return <SplashPage />;
}
