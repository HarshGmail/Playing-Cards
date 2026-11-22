import { describe, expect, it, vi } from 'vitest';
import {
  enterFullscreen,
  exitFullscreen,
  isFullscreenActive,
  isFullscreenSupported,
} from './fullscreen';

const element = {} as Element;

describe('isFullscreenSupported', () => {
  it('is true when the document allows it and the target can request it', () => {
    expect(isFullscreenSupported({ fullscreenEnabled: true }, { requestFullscreen: vi.fn() })).toBe(true);
  });

  it('accepts the webkit prefixed API', () => {
    expect(
      isFullscreenSupported(
        { webkitFullscreenEnabled: true },
        { webkitRequestFullscreen: vi.fn() }
      )
    ).toBe(true);
  });

  it('is false where the API is missing, as on iPhone Safari', () => {
    expect(isFullscreenSupported({}, {})).toBe(false);
  });

  it('is false when the document disables fullscreen', () => {
    expect(isFullscreenSupported({ fullscreenEnabled: false }, { requestFullscreen: vi.fn() })).toBe(false);
  });

  it('is false when the target cannot request fullscreen', () => {
    expect(isFullscreenSupported({ fullscreenEnabled: true }, {})).toBe(false);
  });
});

describe('isFullscreenActive', () => {
  it('reads the standard and prefixed element', () => {
    expect(isFullscreenActive({ fullscreenElement: element })).toBe(true);
    expect(isFullscreenActive({ webkitFullscreenElement: element })).toBe(true);
  });

  it('is false with no fullscreen element', () => {
    expect(isFullscreenActive({ fullscreenElement: null })).toBe(false);
    expect(isFullscreenActive({})).toBe(false);
  });
});

describe('enterFullscreen', () => {
  it('prefers the standard request', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const webkitRequestFullscreen = vi.fn();
    await enterFullscreen({ requestFullscreen, webkitRequestFullscreen });
    expect(requestFullscreen).toHaveBeenCalled();
    expect(webkitRequestFullscreen).not.toHaveBeenCalled();
  });

  it('falls back to the webkit request', async () => {
    const webkitRequestFullscreen = vi.fn();
    await enterFullscreen({ webkitRequestFullscreen });
    expect(webkitRequestFullscreen).toHaveBeenCalled();
  });
});

describe('exitFullscreen', () => {
  it('prefers the standard exit and falls back to webkit', async () => {
    const exit = vi.fn().mockResolvedValue(undefined);
    await exitFullscreen({ exitFullscreen: exit });
    expect(exit).toHaveBeenCalled();

    const webkitExit = vi.fn();
    await exitFullscreen({ webkitExitFullscreen: webkitExit });
    expect(webkitExit).toHaveBeenCalled();
  });
});
