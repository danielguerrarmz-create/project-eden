/**
 * Root.tsx — top-level route switch.
 *
 * THE PRODUCTION SITE IS TWO PAGES AND NOTHING ELSE:
 *
 * `#/`      -> the home: hero, the two product-photograph bands, the register close,
 *              and the company monument (SplashPage).
 * `#/about` -> the founders / timeline page (AboutPage).
 * anything else -> the home splash (fallback, so a stray hash never dead-ends and the
 *                  splash's in-page `#register` anchor keeps resolving).
 *
 * EVERYTHING ENGINE-FACING IS DEV-ONLY (2026-07-21). Daniel's ruling: the studio/engine
 * "is not something to be proud of at this time", so it comes off the live site entirely
 * and stays hidden while it is rebuilt. `#/studio`, `#/draw`, `#/engine`, `#/shape`,
 * `#/sculpt`, `#/lab/botanical` and `#/lab/gongbi` render only under
 * `import.meta.env.DEV` and all still work under `npm run dev` — that is the point of a
 * gate rather than a deletion. In a production build they resolve to the home splash.
 *
 * The gate is the ternary below, NOT a runtime check inside the component: Vite folds
 * `import.meta.env.DEV` to `false` at build time, the dead branch takes its `import()`
 * with it, and the engine (three.js, the draw tool, the labs) is never emitted into the
 * production bundle at all. The route decision itself lives in `resolveRoute`
 * (routing.ts) so it can be unit-tested for both values of `dev`.
 */
import { Suspense, lazy } from 'react';
import { SplashPage } from './pages/SplashPage';
import { AboutPage } from './pages/AboutPage';
import { resolveRoute, useRoute } from './routing';

/** Null in production. See the note above: this ternary IS the gate. */
const DevRoutes = import.meta.env.DEV
  ? lazy(() => import('./DevRoutes').then((m) => ({ default: m.DevRoutes })))
  : null;

export function Root() {
  const route = useRoute();
  const target = resolveRoute(route, import.meta.env.DEV);
  if (target === 'about') return <AboutPage />;
  if (target === 'engine' && DevRoutes) {
    return (
      <Suspense fallback={null}>
        <DevRoutes route={route} />
      </Suspense>
    );
  }
  return <SplashPage />;
}
