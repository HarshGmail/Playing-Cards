'use client';

import { useCallback, useEffect, useState } from 'react';
import { CAPTURED_INSTALL_PROMPT_KEY, INSTALL_READY_EVENT } from '@/lib/install/capture';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallCaptureWindow = Window & { [CAPTURED_INSTALL_PROMPT_KEY]?: BeforeInstallPromptEvent };

function readCapturedPrompt(): BeforeInstallPromptEvent | null {
  return (window as InstallCaptureWindow)[CAPTURED_INSTALL_PROMPT_KEY] ?? null;
}

function clearCapturedPrompt(): void {
  (window as InstallCaptureWindow)[CAPTURED_INSTALL_PROMPT_KEY] = undefined;
}

export function useInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const pickUpCapturedPrompt = () => setInstallEvent(readCapturedPrompt());
    const handleInstalled = () => {
      clearCapturedPrompt();
      setInstallEvent(null);
    };

    pickUpCapturedPrompt();
    window.addEventListener(INSTALL_READY_EVENT, pickUpCapturedPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener(INSTALL_READY_EVENT, pickUpCapturedPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    clearCapturedPrompt();
    setInstallEvent(null);
  }, [installEvent]);

  return { canInstall: installEvent !== null, install };
}
