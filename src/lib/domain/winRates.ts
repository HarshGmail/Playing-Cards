const PERCENT = 100;

function ratio(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

export function matchWinRate(matchWins: number, matchesPlayed: number): number {
  return ratio(matchWins, matchesPlayed);
}

export function strikeRate(gamesWon: number, gamesPlayed: number): number {
  return ratio(gamesWon, gamesPlayed);
}

export function formatStrikeRate(rate: number): string {
  return (rate * PERCENT).toFixed(1);
}
