/**
 * Root.tsx — top-level route switch.
 *
 * Bower is one company with one product (Eden), so the company home and the Eden
 * product page are one combined landing. The generative-engine explainer, once
 * its own `#/engine` page, now lives inside that landing as the `#how-it-works`
 * band, so there are only two surfaces.
 *
 * `#/`       -> the combined Bower + Eden landing (the splash home, with the
 *               engine explainer folded in as `#how-it-works`).
 * `#/studio` -> the single-page studio (the configurator, untouched component).
 * anything else -> the splash landing (fallback, so a stray hash never dead-ends
 * and the splash's in-page `#how-it-works` / `#register` anchors keep resolving).
 */
import App from './App';
import { SplashPage } from './pages/SplashPage';
import { useRoute } from './routing';

export function Root() {
  const route = useRoute();
  if (route === '/studio') return <App />;
  return <SplashPage />;
}
