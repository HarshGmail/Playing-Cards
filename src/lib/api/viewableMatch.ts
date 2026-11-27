import { ObjectId } from 'mongodb';
import { getMatches, Match } from '@/lib/db/collections';

export type ViewableMatchResult =
  | { status: 'ok'; match: Match }
  | { status: 'not-found' }
  | { status: 'forbidden' };

export function canViewMatch(match: Match, userId: string): boolean {
  return (
    match.creatorId === userId ||
    match.roster.some((entry) => entry.userId === userId) ||
    (match.spectators ?? []).some((spectator) => spectator.userId === userId)
  );
}

export async function loadViewableMatch(matchId: string, userId: string): Promise<ViewableMatchResult> {
  if (!ObjectId.isValid(matchId)) return { status: 'not-found' };
  const matchesCol = await getMatches();
  const match = await matchesCol.findOne({ _id: new ObjectId(matchId), deletedAt: null });
  if (!match) return { status: 'not-found' };
  return canViewMatch(match, userId) ? { status: 'ok', match } : { status: 'forbidden' };
}
