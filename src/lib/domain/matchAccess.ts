import type { Match } from '@/lib/db/collections';

export type MatchAccessFields = Pick<Match, 'creatorId' | 'roster' | 'spectators'>;

export function isMatchParticipant(match: MatchAccessFields, userId: string): boolean {
  return (
    match.creatorId === userId ||
    match.roster.some((entry) => entry.userId === userId) ||
    (match.spectators ?? []).some((spectator) => spectator.userId === userId)
  );
}

export function isFriendOfParticipant(match: MatchAccessFields, friendIds: string[]): boolean {
  const participants = new Set([match.creatorId, ...match.roster.map((entry) => entry.userId)]);
  return friendIds.some((friendId) => participants.has(friendId));
}
