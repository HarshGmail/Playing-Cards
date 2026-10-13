export const INACTIVITY_WINDOW_MS = 24 * 60 * 60 * 1000;

export const GAME_TIME_MESSAGES = [
  'Shuffle up! Round up your friends for a game tonight.',
  'The deck is getting lonely. Time for a round?',
  'Your rating will not climb on its own. Game night?',
  'Cards are dealt, seats are open. Who is in tonight?',
  'Quick round before bed? Your friends are a tap away.',
];

export function inactiveSince(now: Date): Date {
  return new Date(now.getTime() - INACTIVITY_WINDOW_MS);
}

export function usersToRemind(allUserIds: string[], recentlyActiveIds: Iterable<string>): string[] {
  const active = new Set(recentlyActiveIds);
  return allUserIds.filter((userId) => !active.has(userId));
}

export function gameTimeMessageFor(now: Date): string {
  const dayNumber = Math.floor(now.getTime() / INACTIVITY_WINDOW_MS);
  return GAME_TIME_MESSAGES[dayNumber % GAME_TIME_MESSAGES.length];
}
