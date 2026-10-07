import type { LeaderboardMetric, LeaderboardRow, PodiumCounts } from '@/types';

export interface RankableStats {
  userId: string;
  rating: number;
  winPct: number;
  matchWins: number;
  podiums: PodiumCounts;
  gamesWon: number;
  gamesPlayed: number;
  matchesPlayed: number;
}

export interface RankableIdentity {
  name: string;
  username: string;
  profilePicUrl: string | null;
}

type MetricKey = 'rating' | 'matchWins' | 'winPct' | 'gamesPlayed';

export const METRIC_SORT_KEYS: Record<LeaderboardMetric, [MetricKey, MetricKey]> = {
  rating: ['rating', 'matchWins'],
  winPct: ['winPct', 'gamesPlayed'],
};

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

export function strictlyAheadFilter(metric: LeaderboardMetric, stats: RankableStats) {
  const [primary, secondary] = METRIC_SORT_KEYS[metric];
  return {
    $or: [
      { [primary]: { $gt: stats[primary] } },
      { [primary]: stats[primary], [secondary]: { $gt: stats[secondary] } },
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
    winPct: stats.winPct,
    matchWins: stats.matchWins,
    podiums: stats.podiums,
    gamesWon: stats.gamesWon,
    gamesPlayed: stats.gamesPlayed,
    matchesPlayed: stats.matchesPlayed,
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
