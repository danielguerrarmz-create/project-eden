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
 * `#/studio` -> the ENGINE: the draw tool (DrawPage). Replaced the old
 *               four-slider configurator on 2026-07-17 (Daniel: "our studio page
 *               is what the engine should be"), so the STUDIO nav link and the
 *               "shape your Eden" CTA both open the draw-and-bake engine. `/draw`
 *               stays as an alias for the same page. The old slider studio (App)
 *               is retired from routing; the component is kept in the tree.
 * anything else -> the splash landing (fallback, so a stray hash never dead-ends
 * and the splash's in-page `#how-it-works` / `#register` anchors keep resolving).
 */
import { EnginePage } from './pages/engine/EnginePage';
import { SplashPage } from './pages/SplashPage';
import { AboutPage } from './pages/AboutPage';
import { ShapePage } from './pages/ShapePage';
import { SculptPage } from './pages/SculptPage';
import { DrawPage } from './pages/DrawPage';
import { BotanicalLab } from './pages/lab/BotanicalLab';
import { GongbiLab } from './pages/lab/GongbiLab';
import { useRoute } from './routing';

export function Root() {
  const route = useRoute();
  if (route === '/studio') return <DrawPage />;
  if (route === '/engine') return <EnginePage />;
  if (route === '/about') return <AboutPage />;
  if (route === '/draw') return <DrawPage />;
  if (route === '/shape') return <ShapePage />;
  if (route === '/sculpt') return <SculptPage />;
  if (route === '/lab/botanical') return <BotanicalLab />;
  if (route === '/lab/gongbi') return <GongbiLab />;
  return <SplashPage />;
}
