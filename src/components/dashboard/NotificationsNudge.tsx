'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellOff, BellRing, Loader2, X } from 'lucide-react';
import { usePushNotifications } from '@/components/pwa/usePushNotifications';
import { CARD_CLASS, ICON_BADGE_CLASS, PRIMARY_BUTTON_CLASS } from '@/components/pwa/pwaClasses';
import { NOTIFICATIONS_SETTINGS_URL } from '@/components/pwa/settingsLinks';
import { isSnoozed, snooze, PROMPT_SNOOZE_DAYS } from '@/components/pwa/snooze';

const SNOOZE_KEY = 'playing-cards-notifications-nudge-snoozed-until';

export default function NotificationsNudge() {
  const router = useRouter();
  const push = usePushNotifications();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(isSnoozed(SNOOZE_KEY));
  }, []);

  const canOfferPush = push.ready && push.isConfigured && push.support === 'supported';
  if (hidden || !canOfferPush || push.subscribed) return null;

  const blocked = push.permission === 'denied';

  const dismiss = () => {
    snooze(SNOOZE_KEY);
    setHidden(true);
  };

  const turnOn = async () => {
    if (blocked) {
      router.push(NOTIFICATIONS_SETTINGS_URL);
      return;
    }
    const enabled = await push.enable();
    if (!enabled) router.push(NOTIFICATIONS_SETTINGS_URL);
  };

  return (
    <div className={`${CARD_CLASS} items-center`}>
      <div className={ICON_BADGE_CLASS}>
        {blocked ? <BellOff className="h-5 w-5" aria-hidden /> : <BellRing className="h-5 w-5" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 dark:text-white">
          {blocked ? 'Notifications are blocked' : 'Turn on notifications'}
        </p>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
          {blocked
            ? 'Allow them for this site to hear about invites, rounds and wins.'
            : 'Hear about invites, scored rounds and wins, even when the app is closed.'}
        </p>
      </div>
      <button type="button" onClick={turnOn} disabled={push.busy} className={`${PRIMARY_BUTTON_CLASS} shrink-0`}>
        {push.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {blocked ? 'How to allow' : 'Turn on'}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={`Hide for ${PROMPT_SNOOZE_DAYS} days`}
        title={`Hide for ${PROMPT_SNOOZE_DAYS} days`}
        className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-violet-100 hover:text-gray-700 dark:hover:bg-violet-900/40 dark:hover:text-gray-200"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
