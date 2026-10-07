'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/fetcher';
import {
  PlatformSnapshot,
  PushSupport,
  readPlatformSnapshot,
  resolvePushSupport,
  shouldShowIosInstallHelp,
  urlBase64ToUint8Array,
} from '@/lib/push/platform';

const SUBSCRIBE_URL = '/api/push/subscribe';
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type PushPermission = NotificationPermission | 'unavailable';

interface PushState {
  ready: boolean;
  support: PushSupport;
  showIosInstallHelp: boolean;
  permission: PushPermission;
  subscribed: boolean;
  busy: boolean;
  error: string | null;
}

const INITIAL_STATE: PushState = {
  ready: false,
  support: 'unsupported',
  showIosInstallHelp: false,
  permission: 'unavailable',
  subscribed: false,
  busy: false,
  error: null,
};

function readPermission(snapshot: PlatformSnapshot): PushPermission {
  return snapshot.hasNotification ? Notification.permission : 'unavailable';
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

function saveSubscription(subscription: PushSubscription): Promise<unknown> {
  return apiFetch(SUBSCRIBE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>(INITIAL_STATE);
  const isConfigured = VAPID_PUBLIC_KEY.length > 0;

  const refresh = useCallback(async () => {
    const snapshot = readPlatformSnapshot();
    const support = resolvePushSupport(snapshot);
    const permission = readPermission(snapshot);
    let subscribed = false;

    if (support === 'supported' && permission === 'granted') {
      const subscription = await currentSubscription().catch(() => null);
      subscribed = subscription !== null;
      if (subscription) await saveSubscription(subscription).catch(() => undefined);
    }

    setState((prev) => ({
      ...prev,
      ready: true,
      support,
      showIosInstallHelp: shouldShowIosInstallHelp(snapshot),
      permission,
      subscribed,
    }));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    setState((prev) => ({ ...prev, busy: true, error: null }));
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState((prev) => ({ ...prev, busy: false, permission }));
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        }));
      await saveSubscription(subscription);
      setState((prev) => ({ ...prev, busy: false, permission, subscribed: true }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        busy: false,
        error: err instanceof Error ? err.message : 'Could not enable notifications',
      }));
    }
  }, []);

  const disable = useCallback(async () => {
    setState((prev) => ({ ...prev, busy: true, error: null }));
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        await apiFetch(SUBSCRIBE_URL, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState((prev) => ({ ...prev, busy: false, subscribed: false }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        busy: false,
        error: err instanceof Error ? err.message : 'Could not turn off notifications',
      }));
    }
  }, []);

  return { ...state, isConfigured, enable, disable };
}
