'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { isIosDevice, readPlatformSnapshot } from '@/lib/push/platform';
import { useInstallPrompt } from './useInstallPrompt';

const SNOOZE_KEY = 'playing-cards-install-banner-snoozed-until';
const SNOOZE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const BANNER_CLASS =
  'border-b border-violet-200 bg-violet-50 text-gray-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-gray-100';
const INSTALL_BUTTON_CLASS =
  'inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-violet-700';
const DISMISS_BUTTON_CLASS =
  'shrink-0 rounded-lg p-1.5 text-gray-500 transition hover:bg-violet-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-violet-900/40 dark:hover:text-gray-100';

function isSnoozed(): boolean {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function snoozeBanner(): void {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * DAY_MS));
  } catch {
    return;
  }
}

export default function InstallBanner() {
  const { canInstall, install } = useInstallPrompt();
  const [isEligible, setIsEligible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const snapshot = readPlatformSnapshot();
    const markInstalled = () => setIsInstalled(true);

    setIsIos(isIosDevice(snapshot));
    setIsEligible(!snapshot.isStandalone && !isSnoozed());
    window.addEventListener('appinstalled', markInstalled);
    return () => window.removeEventListener('appinstalled', markInstalled);
  }, []);

  if (!isEligible || isInstalled || (!canInstall && !isIos)) return null;

  const dismiss = () => {
    snoozeBanner();
    setIsEligible(false);
  };

  return (
    <div role="region" aria-label="Install app" className={BANNER_CLASS}>
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 text-sm">
        <Download className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
        <p className="min-w-0 flex-1">
          {canInstall ? (
            <>
              Install <strong>Playing Cards</strong> for quicker access and a full-screen view.
            </>
          ) : (
            <>
              Tap <Share className="inline h-4 w-4 align-text-bottom" aria-label="Share" /> Share, then{' '}
              <strong>Add to Home Screen</strong> to install <strong>Playing Cards</strong>.
            </>
          )}
        </p>
        {canInstall && (
          <button type="button" onClick={install} className={INSTALL_BUTTON_CLASS}>
            Install
          </button>
        )}
        <button type="button" onClick={dismiss} aria-label="Hide for now" className={DISMISS_BUTTON_CLASS}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
