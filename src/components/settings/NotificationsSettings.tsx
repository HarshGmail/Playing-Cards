'use client';

import { BellRing, Loader2 } from 'lucide-react';
import PushTestButton from '@/components/pwa/PushTestButton';
import { usePushNotifications } from '@/components/pwa/usePushNotifications';
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '@/components/pwa/pwaClasses';

const MUTED_TEXT = 'text-sm text-gray-600 dark:text-gray-400';

export default function NotificationsSettings() {
  const push = usePushNotifications();

  if (!push.ready) return <p className={MUTED_TEXT}>Checking this device…</p>;

  if (push.showIosInstallHelp) {
    return (
      <p className={MUTED_TEXT}>
        On iPhone and iPad, notifications work only from the app added to your Home Screen. Add it from the Install app section first.
      </p>
    );
  }

  if (!push.isConfigured) return <p className={MUTED_TEXT}>Notifications are not set up on this server.</p>;

  if (push.support !== 'supported') {
    return <p className={MUTED_TEXT}>This browser cannot receive push notifications.</p>;
  }

  if (push.permission === 'denied') {
    return (
      <p className={MUTED_TEXT}>
        Notifications are blocked for this site. Allow them in your browser or system settings.
      </p>
    );
  }

  if (!push.subscribed) {
    return (
      <div className="space-y-3">
        <p className={MUTED_TEXT}>Get told about match invites, scored rounds and wins even when the app is closed.</p>
        {push.error && <p className="text-sm text-red-600 dark:text-red-400">{push.error}</p>}
        <button type="button" onClick={push.enable} disabled={push.busy} className={PRIMARY_BUTTON_CLASS}>
          {push.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
          Enable on this device
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <BellRing className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          On for this device
        </p>
        <button type="button" onClick={push.disable} disabled={push.busy} className={SECONDARY_BUTTON_CLASS}>
          {push.busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Turn off
        </button>
      </div>
      <PushTestButton />
    </div>
  );
}
