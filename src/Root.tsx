/**
 * Root.tsx — top-level route switch.
 *
 * `#/engine` -> the generative-engine explainer (the documentation layer).
 * Everything else -> the single-page studio, untouched.
 */
import App from './App';
import { EnginePage } from './pages/EnginePage';
import { useRoute } from './routing';

export function Root() {
  const route = useRoute();
  if (route === '/engine') return <EnginePage />;
  return <App />;
}
