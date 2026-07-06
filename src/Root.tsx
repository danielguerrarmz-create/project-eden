/**
 * Root.tsx — top-level route switch.
 *
 * `#/`       -> the splash landing (the new home, above the studio).
 * `#/studio` -> the single-page studio (the configurator, untouched component).
 * `#/engine` -> the generative-engine explainer (the documentation layer).
 * anything else -> the splash landing (fallback, so a stray hash never dead-ends).
 */
import App from './App';
import { EnginePage } from './pages/EnginePage';
import { SplashPage } from './pages/SplashPage';
import { useRoute } from './routing';

export function Root() {
  const route = useRoute();
  if (route === '/engine') return <EnginePage />;
  if (route === '/studio') return <App />;
  return <SplashPage />;
}
