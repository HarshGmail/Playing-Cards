export interface FullscreenDocument {
  fullscreenEnabled?: boolean;
  webkitFullscreenEnabled?: boolean;
  fullscreenElement?: Element | null;
  webkitFullscreenElement?: Element | null;
  exitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void> | void;
}

export interface FullscreenTarget {
  requestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void> | void;
}

export const FULLSCREEN_CHANGE_EVENTS = ['fullscreenchange', 'webkitfullscreenchange'] as const;

export function isFullscreenSupported(doc: FullscreenDocument, target: FullscreenTarget): boolean {
  const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? false;
  const canRequest = !!target.requestFullscreen || !!target.webkitRequestFullscreen;
  return enabled && canRequest;
}

export function isFullscreenActive(doc: FullscreenDocument): boolean {
  return !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

export async function enterFullscreen(target: FullscreenTarget): Promise<void> {
  if (target.requestFullscreen) return target.requestFullscreen();
  await target.webkitRequestFullscreen?.();
}

export async function exitFullscreen(doc: FullscreenDocument): Promise<void> {
  if (doc.exitFullscreen) return doc.exitFullscreen();
  await doc.webkitExitFullscreen?.();
}
