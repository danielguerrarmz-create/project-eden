/**
 * useAutoplayVideo — the one copy of the fussy "actually start a muted looping video" logic.
 *
 * Shared by the project galleries (AboutPage) and the timeline's inline vine videos, because
 * getting a background <video> to autoplay is fiddlier than it looks and we do not want two
 * drifting copies of the workaround.
 *
 * Starting playback is fussier than it looks. `autoPlay` alone does not survive: React sets
 * `muted` as a property only AFTER the node is in the document, so Chrome has already judged the
 * autoplay policy against an unmuted video and refused. And calling play() straight away in an
 * effect refuses too, because at that instant the browser has not finished picking a <source>
 * and there is nothing to play. So: kick it once now for the already-warm case, and again from
 * the element's own ready event (`onLoadedData` / `onCanPlay`), which is the one that lands.
 *
 * `rate` under 1 is the whole point of the slowed loops: it stops a render reading as a GIF and
 * starts it reading as growth.
 */
import { useCallback, useEffect, useRef } from 'react';

export function useAutoplayVideo(rate = 1) {
  const ref = useRef<HTMLVideoElement>(null);
  const start = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.playbackRate = rate;
    el.muted = true;
    void el.play().catch(() => {});
  }, [rate]);
  useEffect(start, [start]);
  return { ref, start };
}
