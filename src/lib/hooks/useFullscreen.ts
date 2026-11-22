import { useCallback, useEffect, useState } from 'react';
import {
  enterFullscreen,
  exitFullscreen,
  FULLSCREEN_CHANGE_EVENTS,
  isFullscreenActive,
  isFullscreenSupported,
  type FullscreenDocument,
  type FullscreenTarget,
} from '@/lib/fullscreen';

export function useFullscreen() {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const doc = document as FullscreenDocument;
    const target = document.documentElement as FullscreenTarget;
    setSupported(isFullscreenSupported(doc, target));
    setActive(isFullscreenActive(doc));

    const syncActive = () => setActive(isFullscreenActive(doc));
    FULLSCREEN_CHANGE_EVENTS.forEach((name) => document.addEventListener(name, syncActive));
    return () => {
      FULLSCREEN_CHANGE_EVENTS.forEach((name) => document.removeEventListener(name, syncActive));
      if (isFullscreenActive(doc)) void exitFullscreen(doc).catch(() => undefined);
    };
  }, []);

  const toggle = useCallback(async () => {
    const doc = document as FullscreenDocument;
    try {
      if (isFullscreenActive(doc)) {
        await exitFullscreen(doc);
      } else {
        await enterFullscreen(document.documentElement as FullscreenTarget);
      }
    } catch {
      setActive(isFullscreenActive(doc));
    }
  }, []);

  return { supported, active, toggle };
}
