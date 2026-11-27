import { ObjectId } from 'mongodb';
import { getMatches, Match } from '@/lib/db/collections';
import { isFriendOfParticipant, isMatchParticipant, type MatchAccessFields } from '@/lib/domain/matchAccess';
import { viewerAndFriendIds } from '@/lib/stats/friends';

export type ViewableMatchResult =
  | { status: 'ok'; match: Match }
  | { status: 'not-found' }
  | { status: 'forbidden' };

export async function canWatchMatch(match: MatchAccessFields, userId: string): Promise<boolean> {
  if (isMatchParticipant(match, userId)) return true;
  const friendIds = (await viewerAndFriendIds(userId)).filter((id) => id !== userId);
  return isFriendOfParticipant(match, friendIds);
}

export async function loadViewableMatch(matchId: string, userId: string): Promise<ViewableMatchResult> {
  if (!ObjectId.isValid(matchId)) return { status: 'not-found' };
  const matchesCol = await getMatches();
  const match = await matchesCol.findOne({ _id: new ObjectId(matchId), deletedAt: null });
  if (!match) return { status: 'not-found' };
  return (await canWatchMatch(match, userId)) ? { status: 'ok', match } : { status: 'forbidden' };
}
