export type PushSupport = 'supported' | 'needs-install' | 'unsupported';

export interface PlatformSnapshot {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  isStandalone: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
}

const IOS_DEVICE_PATTERN = /iPad|iPhone|iPod/;
const IPADOS_DESKTOP_PLATFORM = 'MacIntel';

export function isIosDevice(snapshot: Pick<PlatformSnapshot, 'userAgent' | 'platform' | 'maxTouchPoints'>): boolean {
  if (IOS_DEVICE_PATTERN.test(snapshot.userAgent)) return true;
  return snapshot.platform === IPADOS_DESKTOP_PLATFORM && snapshot.maxTouchPoints > 1;
}

export function resolvePushSupport(snapshot: PlatformSnapshot): PushSupport {
  const fullyCapable =
    snapshot.hasServiceWorker && snapshot.hasPushManager && snapshot.hasNotification;
  if (fullyCapable) return 'supported';
  if (isIosDevice(snapshot) && !snapshot.isStandalone) return 'needs-install';
  return 'unsupported';
}

export function shouldShowIosInstallHelp(snapshot: PlatformSnapshot): boolean {
  return isIosDevice(snapshot) && !snapshot.isStandalone;
}

export function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function readPlatformSnapshot(): PlatformSnapshot {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    isStandalone:
      window.matchMedia('(display-mode: standalone)').matches ||
      navigatorWithStandalone.standalone === true,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    hasNotification: 'Notification' in window,
  };
}
