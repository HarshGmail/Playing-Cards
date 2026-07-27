interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(key: string): Map<string, RateLimitEntry> {
  if (!stores.has(key)) {
    stores.set(key, new Map());
  }
  return stores.get(key)!;
}

export function rateLimit(
  key: string,
  identifier: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const store = getStore(key);

  let entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(identifier, entry);
  }

  const remaining = Math.max(0, maxAttempts - entry.count);
  const allowed = entry.count < maxAttempts;

  if (allowed) {
    entry.count += 1;
  }

  return { allowed, remaining, resetAt: entry.resetAt };
}
