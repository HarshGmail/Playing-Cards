export interface PlayerAggregate {
  playerId: string;
  scores: number[];
  total: number;
  roundsPlayed: number;
  average: number;
  stdDev: number;
  isDnf: boolean;
}

export interface LeaderboardEntry {
  position: number;
  playerId: string;
  name: string;
  total: number;
  average: number;
  stdDev: number;
  roundsPlayed: number;
  gapToLeader: number;
  gapToAhead: number | null;
  isDnf: boolean;
  isSharedPosition: boolean;
  isLast: boolean;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function computeLeaderboard(
  aggregates: PlayerAggregate[],
  rankPreference: 'highest-first' | 'lowest-first',
  tiebreakers: string[]
): LeaderboardEntry[] {
  const comparator = (a: PlayerAggregate, b: PlayerAggregate) => {
    // Primary sort: total
    const totalCompare =
      rankPreference === 'highest-first'
        ? b.total - a.total
        : a.total - b.total;
    if (totalCompare !== 0) return totalCompare;

    // Tiebreakers
    for (const breaker of tiebreakers) {
      let compare = 0;
      switch (breaker) {
        case 'lower-average':
          compare = a.average - b.average;
          break;
        case 'higher-average':
          compare = b.average - a.average;
          break;
        case 'more-consistent':
          compare = a.stdDev - b.stdDev;
          break;
        case 'less-consistent':
          compare = b.stdDev - a.stdDev;
          break;
      }
      if (compare !== 0) return compare;
    }

    return 0;
  };

  const sorted = [...aggregates].sort(comparator);

  // Assign positions
  const positions: number[] = [];
  let currentPosition = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && comparator(sorted[i], sorted[i - 1]) !== 0) {
      currentPosition = i + 1;
    }
    positions.push(currentPosition);
  }

  // Determine who is last (among active players only). With 3 or fewer
  // active players, nobody is singled out as "last" — red is reserved for
  // matches where being last is meaningfully distinct from 4th+.
  const activeCount = sorted.filter((agg) => !agg.isDnf).length;
  const lastPosition = Math.max(
    ...sorted
      .map((agg, idx) => (!agg.isDnf ? positions[idx] : 0))
  );

  return sorted.map((agg, idx) => {
    const position = positions[idx];
    const isDnf = agg.isDnf;
    const isLast = !isDnf && activeCount > 3 && position === lastPosition;
    const isSharedPosition =
      (idx > 0 && comparator(sorted[idx], sorted[idx - 1]) === 0) ||
      (idx < sorted.length - 1 && comparator(sorted[idx], sorted[idx + 1]) === 0);

    // Gap to leader
    const leader = sorted[0];
    const gapToLeader =
      rankPreference === 'highest-first'
        ? Math.abs(leader.total - agg.total)
        : Math.abs(agg.total - leader.total);

    // Gap to ahead (or null if leader)
    let gapToAhead: number | null = null;
    if (idx > 0) {
      const ahead = sorted[idx - 1];
      gapToAhead =
        rankPreference === 'highest-first'
          ? Math.abs(ahead.total - agg.total)
          : Math.abs(agg.total - ahead.total);
    }

    return {
      position,
      playerId: agg.playerId,
      name: '', // Set by caller
      total: agg.total,
      average: agg.average,
      stdDev: agg.stdDev,
      roundsPlayed: agg.roundsPlayed,
      gapToLeader,
      gapToAhead,
      isDnf,
      isSharedPosition,
      isLast,
    };
  });
}

export function computeGamesWon(
  scoresByRound: Array<Array<{ playerId: string; value: number }>>,
  rankPreference: 'highest-first' | 'lowest-first'
): Map<string, number> {
  const gamesWon = new Map<string, number>();

  for (const round of scoresByRound) {
    if (round.length === 0) continue;

    const bestValue = rankPreference === 'highest-first'
      ? Math.max(...round.map(s => s.value))
      : Math.min(...round.map(s => s.value));

    for (const { playerId, value } of round) {
      if (value === bestValue) {
        gamesWon.set(playerId, (gamesWon.get(playerId) || 0) + 1);
      }
    }
  }

  return gamesWon;
}

export function buildAggregates(
  scoresByPlayer: Map<string, { scores: number[]; isDnf: boolean }>
): PlayerAggregate[] {
  return Array.from(scoresByPlayer.entries()).map(([playerId, data]) => {
    const scores = data.scores;
    const total = scores.reduce((a, b) => a + b, 0);
    const roundsPlayed = scores.length;
    const average = roundsPlayed > 0 ? total / roundsPlayed : 0;
    const std = stdDev(scores);

    return {
      playerId,
      scores,
      total,
      roundsPlayed,
      average,
      stdDev: std,
      isDnf: data.isDnf,
    };
  });
}
