const DAY_MS = 24 * 60 * 60 * 1000;

export const PROMPT_SNOOZE_DAYS = 21;

export function isSnoozed(key: string): boolean {
  try {
    return Number(localStorage.getItem(key) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

export function snooze(key: string, days = PROMPT_SNOOZE_DAYS): void {
  try {
    localStorage.setItem(key, String(Date.now() + days * DAY_MS));
  } catch {
    return;
  }
}
