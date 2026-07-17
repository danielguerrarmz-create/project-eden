/**
 * useSpaceHeld.ts — is the space bar down right now?
 *
 * Space-hold + left-drag is the trackpad's orbit. It cannot be two-finger
 * drag: on a trackpad that is already a `wheel` event, and `wheel` is zoom.
 * Reassigning it would trade the zoom that works for the orbit that doesn't.
 *
 * WHY WINDOW-LEVEL, AND WHY THE BLUR GUARD. A key held down while the window
 * loses focus (alt-tab, devtools, a screenshot tool) never delivers its
 * keyup: the browser sends the key events to whoever has focus now. Without
 * the blur guard the page comes back believing space is still held forever,
 * and drawing is dead until you press and release space to teach it otherwise
 * — a bug with no visible cause and no obvious cure, in a tool whose entire
 * promise is that left-drag draws.
 */
import { useEffect, useRef, useState } from 'react';

/** Typing a space into a field is a space, not a camera move. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return (
    el.isContentEditable ||
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'
  );
}

/**
 * Returns `held` to paint with and `heldRef` to read inside a pointer
 * handler. Both, deliberately: a handler that closes over `held` reads a
 * stale value, which is the same class of bug that ate gestures in DrawStage
 * twice. Refs are the truth; state only mirrors for painting.
 */
export function useSpaceHeld(): { held: boolean; heldRef: React.RefObject<boolean> } {
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);

  useEffect(() => {
    const set = (v: boolean) => {
      heldRef.current = v;
      setHeld(v);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTyping(e.target)) return;
      // Space scrolls the page by default, and this page is a scroll
      // container. Orbiting must not also scroll the shot out of frame.
      e.preventDefault();
      if (e.repeat) return; // autorepeat: already held, nothing changed
      set(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTyping(e.target)) return;
      set(false);
    };
    // Every way the keyup can go missing.
    const release = () => set(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
      // Unmounting mid-hold must not leave the ref armed for a remount.
      heldRef.current = false;
    };
  }, []);

  return { held, heldRef };
}
