import type {
  AchievedMilestoneDoc,
  MatchStanding,
  PlayerStreaks,
  PodiumCounts,
} from '@/lib/db/collections';
import type { LeaderboardEntry } from '@/lib/domain/ranking';
import type { MatchLeader } from '@/types';
import { START_RATING, replayRatings, RatedMatch, RatingState } from './rating';
import {
  dayStreaks,
  emptyStreakCounts,
  gameRunsByPlayer,
  RoundScores,
  summarizeRuns,
  summarizeSequence,
} from './streaks';
import { Milestone, MilestoneStats, mergeAchieved, newlyReachedMilestones } from './milestones';

export interface MatchStandingsRecord {
  matchId: string;
  status: 'active' | 'ended';
  roundsPlayed: number;
  createdAt: Date;
  endedAt: Date | null;
  standings: MatchStanding[];
}

export type ActiveDaysByPlayer = Map<string, string[]>;

export interface RosterCutoff {
  userId: string;
  dnfAfterRound: number | null;
}

export interface MilestoneResolution {
  milestones: AchievedMilestoneDoc[];
  toNotify: Milestone[];
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
  streaks: PlayerStreaks;
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
  gameRuns: number[];
  latestActiveMatch: { createdAt: Date; currentGameRun: number } | null;
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
    gameRuns: [],
    latestActiveMatch: null,
  };
}

function recordPodium(podiums: PodiumCounts, rank: number): void {
  if (rank === 1) podiums.first += 1;
  else if (rank === 2) podiums.second += 1;
  else if (rank === 3) podiums.third += 1;
}

export function toRatedMatch(record: MatchStandingsRecord): RatedMatch | null {
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

export function emptyPlayerStreaks(): PlayerStreaks {
  return {
    longestGameStreak: 0,
    currentGameStreak: 0,
    gameStreakCounts: emptyStreakCounts(),
    longestMatchStreak: 0,
    currentMatchStreak: 0,
    longestDayStreak: 0,
    currentDayStreak: 0,
    lastActiveDay: null,
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
  streaks: emptyPlayerStreaks(),
};

export function emptyPlayerStats(userId: string): PlayerStatsAggregate {
  return {
    userId,
    ...ZERO_PLAYER_STATS,
    podiums: { ...ZERO_PLAYER_STATS.podiums },
    streaks: emptyPlayerStreaks(),
  };
}

export function roundScoresWithinCutoff(
  roster: RosterCutoff[],
  scores: Array<{ playerId: string; round: number; value: number }>
): RoundScores[] {
  const cutoffByPlayer = new Map(roster.map((r) => [r.userId, r.dnfAfterRound]));
  const roundsByNumber = new Map<number, RoundScores>();
  for (const score of scores) {
    if (!cutoffByPlayer.has(score.playerId)) continue;
    const cutoff = cutoffByPlayer.get(score.playerId);
    if (cutoff != null && score.round > cutoff) continue;
    if (!roundsByNumber.has(score.round)) {
      roundsByNumber.set(score.round, { round: score.round, scores: [] });
    }
    roundsByNumber.get(score.round)!.scores.push({ playerId: score.playerId, value: score.value });
  }
  return Array.from(roundsByNumber.values());
}

export function withGameRuns(
  standings: MatchStanding[],
  rounds: RoundScores[],
  rankPreference: 'highest-first' | 'lowest-first'
): MatchStanding[] {
  const runsByPlayer = gameRunsByPlayer(rounds, rankPreference);
  return standings.map((standing) => {
    const playerRuns = runsByPlayer.get(standing.playerId);
    return {
      ...standing,
      gameRuns: playerRuns?.runs ?? [],
      currentGameRun: playerRuns?.current ?? 0,
    };
  });
}

function isLaterActiveMatch(tally: Tally, createdAt: Date): boolean {
  return !tally.latestActiveMatch || createdAt >= tally.latestActiveMatch.createdAt;
}

function recordGameRuns(tally: Tally, record: MatchStandingsRecord, standing: MatchStanding): void {
  tally.gameRuns.push(...(standing.gameRuns ?? []));
  if (record.status === 'active' && isLaterActiveMatch(tally, record.createdAt)) {
    tally.latestActiveMatch = {
      createdAt: record.createdAt,
      currentGameRun: standing.currentGameRun ?? 0,
    };
  }
}

function endedInOrder(records: MatchStandingsRecord[]): MatchStandingsRecord[] {
  return records
    .filter((r) => r.status === 'ended' && r.endedAt && r.roundsPlayed > 0)
    .sort((a, b) => a.endedAt!.getTime() - b.endedAt!.getTime());
}

export function matchWinSequences(records: MatchStandingsRecord[]): Map<string, boolean[]> {
  const sequences = new Map<string, boolean[]>();
  for (const record of endedInOrder(records)) {
    for (const standing of rankAmongPlayed(record.standings)) {
      if (!sequences.has(standing.playerId)) sequences.set(standing.playerId, []);
      sequences.get(standing.playerId)!.push(!standing.isDnf && standing.rank === 1);
    }
  }
  return sequences;
}

function buildStreaks(
  tally: Tally,
  matchWinSequence: boolean[],
  activeDays: string[]
): PlayerStreaks {
  const games = summarizeRuns(tally.gameRuns, tally.latestActiveMatch?.currentGameRun ?? 0);
  const matches = summarizeSequence(matchWinSequence);
  const days = dayStreaks(activeDays);
  return {
    longestGameStreak: games.longest,
    currentGameStreak: games.current,
    gameStreakCounts: games.atLeast,
    longestMatchStreak: matches.longest,
    currentMatchStreak: matches.current,
    longestDayStreak: days.longest,
    currentDayStreak: days.current,
    lastActiveDay: days.lastActiveDay,
  };
}

export function toMilestoneStats(aggregate: PlayerStatsAggregate): MilestoneStats {
  return {
    gamesWon: aggregate.gamesWon,
    matchWins: aggregate.matchWins,
    matchesPlayed: aggregate.matchesPlayed,
    gamesPlayed: aggregate.gamesPlayed,
    longestGameStreak: aggregate.streaks.longestGameStreak,
    longestMatchStreak: aggregate.streaks.longestMatchStreak,
    longestDayStreak: aggregate.streaks.longestDayStreak,
  };
}

export function resolveMilestones(
  existing: AchievedMilestoneDoc[] | null,
  stats: MilestoneStats,
  achievedAt: Date
): MilestoneResolution {
  const isBackfill = existing === null;
  const known = existing ?? [];
  const reached = newlyReachedMilestones(stats, known.map((m) => m.id));
  return {
    milestones: mergeAchieved(known, reached, achievedAt).map((m) => ({
      id: m.id,
      achievedAt: new Date(m.achievedAt),
    })),
    toNotify: isBackfill ? [] : reached,
  };
}

export function buildPlayerStats(
  records: MatchStandingsRecord[],
  activeDaysByPlayer: ActiveDaysByPlayer = new Map()
): PlayerStatsBuild {
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
      recordGameRuns(tally, record, standing);
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
  const matchWinsInOrder = matchWinSequences(records);

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
      streaks: buildStreaks(
        tally,
        matchWinsInOrder.get(userId) ?? [],
        activeDaysByPlayer.get(userId) ?? []
      ),
    });
  }

  return { stats, ratings };
}
