/**
 * DevRoutes.tsx — every engine-facing route, in one module that production never loads.
 *
 * Split out of Root on 2026-07-21 when the studio/engine came off the live site (Daniel:
 * "it is not something to be proud of at this time"). Root imports this lazily behind
 * `import.meta.env.DEV`, so in a production build the dead branch is folded away, the
 * `import()` goes with it, and none of this — the draw tool, three.js, the labs — is
 * emitted into the bundle. Under `npm run dev` every route below works exactly as before.
 *
 * Keep this list and `ENGINE_ROUTES` (routing.ts) in step: a route that renders here but
 * is missing from `ENGINE_ROUTES` never gets reached, and a route added to `ENGINE_ROUTES`
 * but not here falls through to the splash even in dev.
 */
import { EnginePage } from './pages/engine/EnginePage';
import { SplashPage } from './pages/SplashPage';
import { ShapePage } from './pages/ShapePage';
import { SculptPage } from './pages/SculptPage';
import { DrawPage } from './pages/DrawPage';
import { BotanicalLab } from './pages/lab/BotanicalLab';
import { GongbiLab } from './pages/lab/GongbiLab';

export function DevRoutes({ route }: { route: string }) {
  /* `#/studio` IS the engine now: the draw tool, not the retired four-slider
     configurator (2026-07-17). `#/draw` stays as an alias for the same page. */
  if (route === '/studio') return <DrawPage />;
  if (route === '/draw') return <DrawPage />;
  if (route === '/engine') return <EnginePage />;
  if (route === '/shape') return <ShapePage />;
  if (route === '/sculpt') return <SculptPage />;
  if (route === '/lab/botanical') return <BotanicalLab />;
  if (route === '/lab/gongbi') return <GongbiLab />;
  return <SplashPage />;
}
