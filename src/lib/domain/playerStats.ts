import type { MatchStanding, PodiumCounts } from '@/lib/db/collections';
import type { LeaderboardEntry } from '@/lib/domain/ranking';
import type { MatchLeader } from '@/types';
import { START_RATING, replayRatings, RatedMatch, RatingState } from './rating';

export interface MatchStandingsRecord {
  matchId: string;
  status: 'active' | 'ended';
  roundsPlayed: number;
  endedAt: Date | null;
  standings: MatchStanding[];
}

export interface PlayerStatsAggregate {
  userId: string;
  rating: number;
  peakRating: number;
  ratedMatches: number;
  matchesPlayed: number;
  matchWins: number;
  podiums: PodiumCounts;
  gamesWon: number;
  gamesPlayed: number;
  winPct: number;
  averageRank: number;
}

export interface PlayerStatsBuild {
  stats: Map<string, PlayerStatsAggregate>;
  ratings: Map<string, RatingState>;
}

interface RankedStanding extends MatchStanding {
  rank: number;
}

interface Tally {
  matchesPlayed: number;
  matchWins: number;
  podiums: PodiumCounts;
  gamesWon: number;
  gamesPlayed: number;
  rankSum: number;
  rankedMatches: number;
}

export function toStandings(entries: LeaderboardEntry[]): MatchStanding[] {
  return entries.map((entry) => ({
    playerId: entry.playerId,
    position: entry.position,
    total: entry.total,
    gamesWon: entry.gamesWon,
    roundsPlayed: entry.roundsPlayed,
    isDnf: entry.isDnf,
    isSharedPosition: entry.isSharedPosition,
  }));
}

function hasPlayed(standing: MatchStanding): boolean {
  return standing.roundsPlayed > 0;
}

export function rankAmongPlayed(standings: MatchStanding[]): RankedStanding[] {
  const played = standings.filter(hasPlayed);
  const finishers = played.filter((s) => !s.isDnf);
  return played.map((standing) => ({
    ...standing,
    rank: standing.isDnf
      ? finishers.length + 1
      : 1 + finishers.filter((other) => other.position < standing.position).length,
  }));
}

export function leaderOf(
  standings: MatchStanding[] | undefined,
  roster: Array<{ userId: string; userName: string }>
): MatchLeader | null {
  const finishers = rankAmongPlayed(standings ?? []).filter((s) => !s.isDnf);
  const leader = finishers.find((s) => s.rank === 1);
  if (!leader) return null;
  return {
    playerId: leader.playerId,
    name: roster.find((r) => r.userId === leader.playerId)?.userName || 'Unknown',
    total: leader.total,
    isTied: finishers.filter((s) => s.rank === 1).length > 1,
  };
}

function emptyTally(): Tally {
  return {
    matchesPlayed: 0,
    matchWins: 0,
    podiums: { first: 0, second: 0, third: 0 },
    gamesWon: 0,
    gamesPlayed: 0,
    rankSum: 0,
    rankedMatches: 0,
  };
}

function recordPodium(podiums: PodiumCounts, rank: number): void {
  if (rank === 1) podiums.first += 1;
  else if (rank === 2) podiums.second += 1;
  else if (rank === 3) podiums.third += 1;
}

function toRatedMatch(record: MatchStandingsRecord): RatedMatch | null {
  if (record.status !== 'ended' || !record.endedAt) return null;
  return {
    matchId: record.matchId,
    endedAt: record.endedAt,
    roundsPlayed: record.roundsPlayed,
    participants: rankAmongPlayed(record.standings).map((s) => ({
      playerId: s.playerId,
      position: s.rank,
      isDnf: s.isDnf,
    })),
  };
}

export const ZERO_PLAYER_STATS: Omit<PlayerStatsAggregate, 'userId'> = {
  rating: START_RATING,
  peakRating: START_RATING,
  ratedMatches: 0,
  matchesPlayed: 0,
  matchWins: 0,
  podiums: { first: 0, second: 0, third: 0 },
  gamesWon: 0,
  gamesPlayed: 0,
  winPct: 0,
  averageRank: 0,
};

export function emptyPlayerStats(userId: string): PlayerStatsAggregate {
  return { userId, ...ZERO_PLAYER_STATS, podiums: { ...ZERO_PLAYER_STATS.podiums } };
}

export function buildPlayerStats(records: MatchStandingsRecord[]): PlayerStatsBuild {
  const tallies = new Map<string, Tally>();
  const tallyFor = (userId: string) => {
    if (!tallies.has(userId)) tallies.set(userId, emptyTally());
    return tallies.get(userId)!;
  };

  for (const record of records) {
    if (record.roundsPlayed <= 0) continue;
    const isEnded = record.status === 'ended';

    for (const standing of rankAmongPlayed(record.standings)) {
      if (standing.isDnf) {
        if (isEnded) tallyFor(standing.playerId);
        continue;
      }
      const tally = tallyFor(standing.playerId);
      tally.matchesPlayed += 1;
      tally.gamesWon += standing.gamesWon;
      tally.gamesPlayed += standing.roundsPlayed;
      if (!isEnded) continue;
      tally.rankSum += standing.rank;
      tally.rankedMatches += 1;
      recordPodium(tally.podiums, standing.rank);
      if (standing.rank === 1) tally.matchWins += 1;
    }
  }

  const ratedMatches = records
    .map(toRatedMatch)
    .filter((match): match is RatedMatch => match !== null);
  const ratings = replayRatings(ratedMatches);

  const stats = new Map<string, PlayerStatsAggregate>();
  for (const [userId, tally] of Array.from(tallies)) {
    const rating = ratings.get(userId);
    stats.set(userId, {
      ...emptyPlayerStats(userId),
      rating: rating?.rating ?? START_RATING,
      peakRating: rating?.peakRating ?? START_RATING,
      ratedMatches: rating?.ratedMatches ?? 0,
      matchesPlayed: tally.matchesPlayed,
      matchWins: tally.matchWins,
      podiums: tally.podiums,
      gamesWon: tally.gamesWon,
      gamesPlayed: tally.gamesPlayed,
      winPct: tally.gamesPlayed > 0 ? tally.gamesWon / tally.gamesPlayed : 0,
      averageRank: tally.rankedMatches > 0 ? tally.rankSum / tally.rankedMatches : 0,
    });
  }

  return { stats, ratings };
}
