import type { Match, RosterEntry } from '@/lib/db/collections';

export type DirectAddDecision = 'add' | 'match-ended' | 'already-in-match';

export function buildRosterEntry(
  match: Pick<Match, 'roster' | 'roundsPlayed'>,
  player: { userId: string; userName: string }
): RosterEntry {
  return {
    userId: player.userId,
    userName: player.userName,
    joinedAtRound: match.roundsPlayed + 1,
    status: 'active',
    dnfAfterRound: null,
    order: match.roster.length,
  };
}

export function decideDirectAdd(
  match: Pick<Match, 'roster' | 'status'>,
  userId: string
): DirectAddDecision {
  if (match.status === 'ended') return 'match-ended';
  if (match.roster.some((entry) => entry.userId === userId)) return 'already-in-match';
  return 'add';
}
