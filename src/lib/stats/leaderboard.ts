import type { LeaderboardMetric, LeaderboardRow, PodiumCounts } from '@/types';
import { matchWinRate } from '@/lib/domain/winRates';
import { ALL_GAMES_KEY } from '@/lib/games/catalog';

export interface RankableStats {
  userId: string;
  rating: number;
  matchWinRate: number;
  matchWins: number;
  podiums: PodiumCounts;
  gamesWon: number;
  gamesPlayed: number;
  matchesPlayed: number;
  streaks?: CurrentStreaks;
}

export interface CurrentStreaks {
  currentGameStreak: number;
  currentMatchStreak: number;
}

export interface RankableIdentity {
  name: string;
  username: string;
  profilePicUrl: string | null;
}

type MetricKey = 'rating' | 'matchWins' | 'matchWinRate' | 'matchesPlayed' | 'gamesWon';

export const METRIC_SORT_KEYS: Record<LeaderboardMetric, [MetricKey, MetricKey]> = {
  rating: ['rating', 'matchWins'],
  winPct: ['matchWinRate', 'matchesPlayed'],
  matchWins: ['matchWins', 'rating'],
  gamesWon: ['gamesWon', 'matchWins'],
};

interface FormatTotals {
  matchesPlayed: number;
  matchWins: number;
  gamesWon: number;
  gamesPlayed: number;
}

export interface LeaderboardSource extends FormatTotals {
  userId: string;
  rating: number;
  podiums: PodiumCounts;
  streaks?: CurrentStreaks;
  ratingsByGame?: Record<string, { rating: number; ratedMatches: number; record?: FormatTotals }>;
}

const EMPTY_TOTALS: FormatTotals = { matchesPlayed: 0, matchWins: 0, gamesWon: 0, gamesPlayed: 0 };

function toRankable(source: LeaderboardSource, rating: number, totals: FormatTotals): RankableStats {
  return {
    userId: source.userId,
    rating,
    matchWinRate: matchWinRate(totals.matchWins, totals.matchesPlayed),
    matchWins: totals.matchWins,
    podiums: source.podiums,
    gamesWon: totals.gamesWon,
    gamesPlayed: totals.gamesPlayed,
    matchesPlayed: totals.matchesPlayed,
    streaks: source.streaks,
  };
}

export function rankableStatsFor(source: LeaderboardSource, gameKey: string): RankableStats | null {
  if (gameKey === ALL_GAMES_KEY) return toRankable(source, source.rating, source);
  const format = source.ratingsByGame?.[gameKey];
  if (!format || format.ratedMatches <= 0) return null;
  return toRankable(source, format.rating, format.record ?? EMPTY_TOTALS);
}

export function compareByMetric(
  metric: LeaderboardMetric,
  a: RankableStats,
  b: RankableStats
): number {
  for (const key of METRIC_SORT_KEYS[metric]) {
    if (a[key] !== b[key]) return b[key] - a[key];
  }
  return 0;
}

export function ratingAheadFilter(stats: Pick<RankableStats, 'rating' | 'matchWins'>) {
  return {
    $or: [
      { rating: { $gt: stats.rating } },
      { rating: stats.rating, matchWins: { $gt: stats.matchWins } },
    ],
  };
}

export function toLeaderboardRow(
  rank: number,
  stats: RankableStats,
  identity: RankableIdentity,
  viewerId: string
): LeaderboardRow {
  return {
    rank,
    userId: stats.userId,
    name: identity.name,
    username: identity.username,
    profilePicUrl: identity.profilePicUrl,
    rating: stats.rating,
    matchWinRate: stats.matchWinRate,
    matchWins: stats.matchWins,
    podiums: stats.podiums,
    gamesWon: stats.gamesWon,
    gamesPlayed: stats.gamesPlayed,
    matchesPlayed: stats.matchesPlayed,
    currentGameStreak: stats.streaks?.currentGameStreak ?? 0,
    currentMatchStreak: stats.streaks?.currentMatchStreak ?? 0,
    isSelf: stats.userId === viewerId,
  };
}

export function sortRows(metric: LeaderboardMetric, rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows].sort(
    (a, b) => a.rank - b.rank || compareByMetric(metric, a, b) || a.name.localeCompare(b.name)
  );
}

export function rankByMetric(
  metric: LeaderboardMetric,
  entries: Array<{ stats: RankableStats; identity: RankableIdentity }>,
  viewerId: string
): LeaderboardRow[] {
  const rows = entries.map(({ stats, identity }) => {
    const ahead = entries.filter((other) => compareByMetric(metric, other.stats, stats) < 0);
    return toLeaderboardRow(ahead.length + 1, stats, identity, viewerId);
  });
  return sortRows(metric, rows);
}

export interface LeaderboardResult {
  rows: LeaderboardRow[];
  self: LeaderboardRow | null;
}

export function buildLeaderboard(
  metric: LeaderboardMetric,
  entries: Array<{ stats: RankableStats; identity: RankableIdentity }>,
  viewerId: string,
  limit: number
): LeaderboardResult {
  const ranked = rankByMetric(metric, entries, viewerId);
  return {
    rows: ranked.slice(0, limit),
    self: ranked.find((row) => row.isSelf) ?? null,
  };
}
