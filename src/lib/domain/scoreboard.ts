export interface ScoreboardRow {
  playerId: string;
  userName: string;
  cells: Array<number | null>;
  total: number;
}

export function buildScoreboardRows(
  rounds: Array<{ round: number; scores: Array<{ playerId: string; value: number }> }>,
  players: Array<{ userId: string; userName: string }>
): ScoreboardRow[] {
  const scoreMatrix = new Map<string, Map<number, number>>();
  players.forEach((p) => scoreMatrix.set(p.userId, new Map()));

  rounds.forEach((round) => {
    round.scores.forEach((score) => {
      scoreMatrix.get(score.playerId)?.set(round.round, score.value);
    });
  });

  return players.map((p) => {
    const perRound = scoreMatrix.get(p.userId) ?? new Map<number, number>();
    const cells: Array<number | null> = rounds.map((round) => {
      const value = perRound.get(round.round);
      return value === undefined ? null : value;
    });
    const total = cells.reduce((sum: number, v) => sum + (v ?? 0), 0);

    return { playerId: p.userId, userName: p.userName, cells, total };
  });
}

export function computeRoundWinners(
  rounds: Array<{ round: number; scores: Array<{ playerId: string; value: number }> }>,
  rankPreference: 'highest-first' | 'lowest-first'
): Array<Set<string>> {
  return rounds.map((round) => {
    if (round.scores.length === 0) return new Set<string>();
    if (rankPreference === 'highest-first') {
      const best = Math.max(...round.scores.map((s) => s.value));
      return new Set(round.scores.filter((s) => s.value === best).map((s) => s.playerId));
    }
    // Lowest-first: 0 is the round-winning score (the round winner always
    // scores 0 by the rules of these games), not just whoever is lowest.
    return new Set(round.scores.filter((s) => s.value === 0).map((s) => s.playerId));
  });
}

export function computeZeroCounts(rows: ScoreboardRow[]): Map<string, number> {
  return new Map(rows.map((row) => [row.playerId, row.cells.filter((c) => c === 0).length]));
}
