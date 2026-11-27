export const WRONG_SHOW_PENALTY = 50;

export interface ShowdownScore {
  playerId: string;
  value: number;
  wrongShow?: boolean;
}

export interface ShowdownRound {
  round: number;
  scores: ShowdownScore[];
}

export type ShowdownOutcome =
  | { kind: 'correct'; shower: string }
  | { kind: 'wrong'; shower: string; declared: number; beaters: string[] }
  | { kind: 'none' };

export interface ShowdownTally {
  correctShows: number;
  wrongShows: number;
  beatShows: number;
}

export function declaredTotal(value: number): number {
  return Math.max(0, value - WRONG_SHOW_PENALTY);
}

export function showdownOutcome(round: ShowdownRound): ShowdownOutcome {
  const wrong = round.scores.find((score) => score.wrongShow);
  if (wrong) {
    const declared = declaredTotal(wrong.value);
    const beaters = round.scores
      .filter((score) => score.playerId !== wrong.playerId && score.value <= declared)
      .map((score) => score.playerId);
    return { kind: 'wrong', shower: wrong.playerId, declared, beaters };
  }
  const zeroScorers = round.scores.filter((score) => score.value === 0);
  return zeroScorers.length === 1 ? { kind: 'correct', shower: zeroScorers[0].playerId } : { kind: 'none' };
}

export type ShowdownMark = 'correct' | 'wrong' | 'beat';

export function showdownMarkFor(outcome: ShowdownOutcome | undefined, playerId: string): ShowdownMark | null {
  if (!outcome || outcome.kind === 'none') return null;
  if (outcome.shower === playerId) return outcome.kind;
  if (outcome.kind === 'wrong' && outcome.beaters.includes(playerId)) return 'beat';
  return null;
}

function emptyTally(): ShowdownTally {
  return { correctShows: 0, wrongShows: 0, beatShows: 0 };
}

export function showdownTallies(rounds: ShowdownRound[], playerIds: string[]): Map<string, ShowdownTally> {
  const tallies = new Map(playerIds.map((playerId) => [playerId, emptyTally()]));
  const tallyFor = (playerId: string) => {
    if (!tallies.has(playerId)) tallies.set(playerId, emptyTally());
    return tallies.get(playerId)!;
  };

  for (const round of rounds) {
    const outcome = showdownOutcome(round);
    if (outcome.kind === 'correct') tallyFor(outcome.shower).correctShows += 1;
    if (outcome.kind === 'wrong') {
      tallyFor(outcome.shower).wrongShows += 1;
      outcome.beaters.forEach((playerId) => (tallyFor(playerId).beatShows += 1));
    }
  }
  return tallies;
}

export function withWrongShowPenalty(value: number, wrongShow: boolean): number {
  return wrongShow ? value + WRONG_SHOW_PENALTY : value;
}
