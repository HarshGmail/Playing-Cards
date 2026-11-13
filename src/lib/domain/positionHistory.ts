import { computeMatchLeaderboard } from './ranking';

export interface PositionRosterEntry {
  userId: string;
  userName: string;
  status: 'active' | 'dnf';
  dnfAfterRound: number | null;
}

export interface PositionRound {
  round: number;
  scores: Array<{ playerId: string; value: number }>;
}

export interface RoundPositions {
  round: number;
  positions: Map<string, number>;
}

export function buildPositionHistory(
  rounds: PositionRound[],
  roster: PositionRosterEntry[],
  rankPreference: 'highest-first' | 'lowest-first',
  tiebreakers: string[]
): RoundPositions[] {
  const orderedRounds = [...rounds].sort((a, b) => a.round - b.round);

  return orderedRounds.map((current, index) => {
    const scoresSoFar = orderedRounds.slice(0, index + 1).flatMap((round) =>
      round.scores.map((score) => ({
        playerId: score.playerId,
        round: round.round,
        value: score.value,
      }))
    );
    const playersWhoScored = new Set(scoresSoFar.map((score) => score.playerId));
    const rankedRoster = roster.filter((player) => playersWhoScored.has(player.userId));
    const board = computeMatchLeaderboard(rankedRoster, scoresSoFar, rankPreference, tiebreakers);

    return {
      round: current.round,
      positions: new Map(board.map((entry) => [entry.playerId, entry.position])),
    };
  });
}
