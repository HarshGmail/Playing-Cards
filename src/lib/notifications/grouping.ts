export interface TimestampedItem {
  createdAt: string | Date;
}

export interface RecencyGroups<T> {
  today: T[];
  earlier: T[];
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function groupByRecency<T extends TimestampedItem>(
  items: T[],
  now: Date = new Date()
): RecencyGroups<T> {
  const groups: RecencyGroups<T> = { today: [], earlier: [] };
  for (const item of items) {
    const bucket = isSameLocalDay(new Date(item.createdAt), now) ? groups.today : groups.earlier;
    bucket.push(item);
  }
  return groups;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(createdAt: string | Date, now: Date = new Date()): string {
  const elapsed = Math.max(0, now.getTime() - new Date(createdAt).getTime());
  if (elapsed < MINUTE_MS) return 'Just now';
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`;
  return `${Math.floor(elapsed / DAY_MS)}d ago`;
}
