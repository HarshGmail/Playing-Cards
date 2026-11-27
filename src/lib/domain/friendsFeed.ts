import type { MatchStanding, RosterEntry } from '@/lib/db/collections';
import { gameDisplayName } from '@/lib/games/catalog';
import type { FeedStanding, FriendMatchCard, GameType } from '@/types';

export const FEED_STANDINGS_SHOWN = 3;
export const FEED_RECENT_DAYS = 14;

export interface FeedMatch {
  id: string;
  name: string;
  status: 'active' | 'ended';
  roundsPlayed: number;
  createdAt: Date;
  endedAt: Date | null;
  gameType?: GameType;
  gameLabel?: string | null;
  roster: Pick<RosterEntry, 'userId' | 'userName'>[];
  standings: MatchStanding[];
}

export interface FeedIdentity {
  username: string;
  profilePicUrl: string | null;
}

function topStandings(match: FeedMatch, identities: Map<string, FeedIdentity>): FeedStanding[] {
  const nameById = new Map(match.roster.map((entry) => [entry.userId, entry.userName]));
  return match.standings
    .filter((standing) => !standing.isDnf && standing.roundsPlayed > 0)
    .sort((a, b) => a.position - b.position)
    .slice(0, FEED_STANDINGS_SHOWN)
    .map((standing) => ({
      playerId: standing.playerId,
      name: nameById.get(standing.playerId) ?? 'Unknown',
      username: identities.get(standing.playerId)?.username ?? '',
      profilePicUrl: identities.get(standing.playerId)?.profilePicUrl ?? null,
      position: standing.position,
      total: standing.total,
    }));
}

export function toFriendMatchCard(
  match: FeedMatch,
  friendIds: Set<string>,
  identities: Map<string, FeedIdentity>
): FriendMatchCard {
  return {
    id: match.id,
    name: match.name,
    gameName: gameDisplayName(match.gameType, match.gameLabel),
    status: match.status,
    roundsPlayed: match.roundsPlayed,
    createdAt: match.createdAt.toISOString(),
    endedAt: match.endedAt ? match.endedAt.toISOString() : null,
    friendNames: match.roster.filter((entry) => friendIds.has(entry.userId)).map((entry) => entry.userName),
    playerCount: match.roster.length,
    standings: topStandings(match, identities),
  };
}

function recency(match: FeedMatch): number {
  return (match.endedAt ?? match.createdAt).getTime();
}

export function orderFeed(matches: FeedMatch[]): FeedMatch[] {
  return [...matches].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
    return recency(b) - recency(a);
  });
}

export function isFeedWorthy(match: FeedMatch, viewerId: string, now: Date): boolean {
  if (match.roster.some((entry) => entry.userId === viewerId)) return false;
  if (match.status === 'active') return match.roundsPlayed > 0;
  const recentCutoff = now.getTime() - FEED_RECENT_DAYS * 24 * 60 * 60 * 1000;
  return !!match.endedAt && match.endedAt.getTime() >= recentCutoff;
}
