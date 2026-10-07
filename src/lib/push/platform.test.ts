import { describe, it, expect } from 'vitest';
import {
  PlatformSnapshot,
  isIosDevice,
  resolvePushSupport,
  shouldShowIosInstallHelp,
  urlBase64ToUint8Array,
} from './platform';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Chrome/120.0';

function snapshot(overrides: Partial<PlatformSnapshot> = {}): PlatformSnapshot {
  return {
    userAgent: DESKTOP_UA,
    platform: 'MacIntel',
    maxTouchPoints: 0,
    isStandalone: false,
    hasServiceWorker: true,
    hasPushManager: true,
    hasNotification: true,
    ...overrides,
  };
}

describe('isIosDevice', () => {
  it('detects iPhone by user agent', () => {
    expect(isIosDevice(snapshot({ userAgent: IPHONE_UA, platform: 'iPhone' }))).toBe(true);
  });

  it('detects iPadOS that reports as a Mac', () => {
    expect(isIosDevice(snapshot({ maxTouchPoints: 5 }))).toBe(true);
  });

  it('does not flag a desktop Mac', () => {
    expect(isIosDevice(snapshot())).toBe(false);
  });
});

describe('resolvePushSupport', () => {
  it('is supported when every API exists', () => {
    expect(resolvePushSupport(snapshot())).toBe('supported');
  });

  it('asks iOS Safari tabs to install first', () => {
    const iosTab = snapshot({
      userAgent: IPHONE_UA,
      platform: 'iPhone',
      hasPushManager: false,
      hasNotification: false,
    });
    expect(resolvePushSupport(iosTab)).toBe('needs-install');
    expect(shouldShowIosInstallHelp(iosTab)).toBe(true);
  });

  it('is supported on an installed iOS app', () => {
    expect(
      resolvePushSupport(snapshot({ userAgent: IPHONE_UA, platform: 'iPhone', isStandalone: true }))
    ).toBe('supported');
  });

  it('is unsupported on a non-iOS browser without push', () => {
    expect(resolvePushSupport(snapshot({ hasPushManager: false }))).toBe('unsupported');
  });
});

describe('urlBase64ToUint8Array', () => {
  it('decodes url-safe base64 without padding', () => {
    expect(Array.from(urlBase64ToUint8Array('SGk'))).toEqual([72, 105]);
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255]);
  });
});
