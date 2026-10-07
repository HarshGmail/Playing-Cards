'use client';

import { useEffect, useState } from 'react';
import { BellRing, BellOff, Download, Share, PlusSquare, Loader2, X } from 'lucide-react';
import { useInstallPrompt } from './useInstallPrompt';
import { usePushNotifications } from './usePushNotifications';

const IOS_HELP_DISMISSED_KEY = 'pwa-ios-help-dismissed';

const CARD_CLASS =
  'flex items-start gap-3 p-4 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20';
const ICON_BADGE_CLASS =
  'flex-shrink-0 w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center';
const PRIMARY_BUTTON_CLASS =
  'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold transition';
const SECONDARY_BUTTON_CLASS =
  'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60 text-sm font-medium transition';

function readIosHelpDismissed(): boolean {
  try {
    return localStorage.getItem(IOS_HELP_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function IosInstallHelp({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className={CARD_CLASS}>
      <div className={ICON_BADGE_CLASS}>
        <Download className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white">Add to Home Screen</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
          To get notifications on iPhone and iPad, install Playing Cards first:
        </p>
        <ol className="text-sm text-gray-700 dark:text-gray-200 mt-2 space-y-1.5">
          <li className="flex items-center gap-2">
            <span className="font-semibold">1.</span> Tap <Share className="w-4 h-4 inline" />
            <span>Share in Safari</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="font-semibold">2.</span> Choose <PlusSquare className="w-4 h-4 inline" />
            <span>Add to Home Screen</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="font-semibold">3.</span>
            <span>Open the app from your Home Screen and enable notifications</span>
          </li>
        </ol>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function PwaPromptCard() {
  const push = usePushNotifications();
  const { canInstall, install } = useInstallPrompt();
  const [iosHelpDismissed, setIosHelpDismissed] = useState(true);

  useEffect(() => {
    setIosHelpDismissed(readIosHelpDismissed());
  }, []);

  const dismissIosHelp = () => {
    setIosHelpDismissed(true);
    try {
      localStorage.setItem(IOS_HELP_DISMISSED_KEY, '1');
    } catch {
      return;
    }
  };

  if (!push.ready) return null;

  if (push.showIosInstallHelp) {
    return iosHelpDismissed ? null : <IosInstallHelp onDismiss={dismissIosHelp} />;
  }

  const showInstall = canInstall;
  const canOfferPush = push.isConfigured && push.support === 'supported';
  const pushBlocked = canOfferPush && push.permission === 'denied';
  const showEnable = canOfferPush && !push.subscribed && push.permission !== 'denied';
  const showEnabledState = canOfferPush && push.subscribed;

  if (!showInstall && !showEnable && !pushBlocked && !showEnabledState) return null;

  if (showEnabledState && !showInstall) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <BellRing className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          Push notifications are on for this device
        </p>
        <button type="button" onClick={push.disable} disabled={push.busy} className={SECONDARY_BUTTON_CLASS}>
          {push.busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Turn off
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showEnable && (
        <div className={CARD_CLASS}>
          <div className={ICON_BADGE_CLASS}>
            <BellRing className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white">Enable notifications</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
              Get told about match invites, scored rounds and wins even when the app is closed.
            </p>
            {push.error && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{push.error}</p>}
            <button type="button" onClick={push.enable} disabled={push.busy} className={`${PRIMARY_BUTTON_CLASS} mt-3`}>
              {push.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
              Enable notifications
            </button>
          </div>
        </div>
      )}

      {pushBlocked && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <BellOff className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Notifications are blocked for this site. Allow them in your browser or system settings to get push alerts.
          </p>
        </div>
      )}

      {showInstall && (
        <div className={CARD_CLASS}>
          <div className={ICON_BADGE_CLASS}>
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white">Install Playing Cards</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
              Add it to your device for quicker access and a full-screen experience.
            </p>
            <button type="button" onClick={install} className={`${PRIMARY_BUTTON_CLASS} mt-3`}>
              <Download className="w-4 h-4" />
              Install app
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
