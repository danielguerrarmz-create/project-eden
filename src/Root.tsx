/**
 * Root.tsx — top-level route switch.
 *
 * `#/engine` -> the Generative Engine explainer (Eden documentation layer).
 * Everything else -> the existing 3-step configurator, untouched.
 */
import App from './App';
import { EnginePage } from './pages/EnginePage';
import { useRoute } from './routing';

export function Root() {
  const route = useRoute();
  if (route === '/engine') return <EnginePage />;
  return <App />;
}
