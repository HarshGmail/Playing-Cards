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
