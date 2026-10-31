export type RankPreference = 'highest-first' | 'lowest-first';

export interface GameRecord {
  score: number;
  won: boolean;
}

export interface PlayerForecastInput {
  playerId: string;
  currentTotal: number;
  history: GameRecord[];
  today: GameRecord[];
}

export interface ForecastOptions {
  remainingGames: number;
  rankPreference: RankPreference;
  zeroWinner: boolean;
  priorScores: number[];
  simulations?: number;
  seed: number;
}

export interface PlayerWinProbability {
  playerId: string;
  winProbability: number;
  expectedTotal: number;
}

export const TODAY_WEIGHT = 3;
export const HISTORY_GAMES_PER_PLAYER = 60;
export const PRIOR_PSEUDO_GAMES = 10;
export const DEFAULT_SIMULATIONS = 4000;
export const ZERO_WINNER_SHARE = 0.8;

export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function targetGameCount(
  targetRounds: number,
  gamesPerRound: number,
  gamesPlayed: number
): number {
  if (gamesPerRound <= 0) return gamesPlayed;
  const roundsNeeded = Math.max(targetRounds, Math.ceil(gamesPlayed / gamesPerRound));
  return roundsNeeded * gamesPerRound;
}

export function isZeroWinnerGame(
  bestScoresPerGame: number[],
  rankPreference: RankPreference
): boolean {
  if (rankPreference !== 'lowest-first' || bestScoresPerGame.length === 0) return false;
  const zeroBest = bestScoresPerGame.filter((best) => best === 0).length;
  return zeroBest / bestScoresPerGame.length >= ZERO_WINNER_SHARE;
}

interface PoolSegment {
  values: number[];
  weight: number;
}

type Sampler = (rng: () => number) => number;

function weightedSampler(segments: PoolSegment[]): Sampler | null {
  const usable = segments.filter((s) => s.values.length > 0 && s.weight > 0);
  const totalWeight = usable.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return null;
  return (rng) => {
    let pick = rng() * totalWeight;
    for (const segment of usable) {
      if (pick < segment.weight) {
        return segment.values[Math.floor(rng() * segment.values.length)];
      }
      pick -= segment.weight;
    }
    const last = usable[usable.length - 1].values;
    return last[last.length - 1];
  };
}

function scoreSampler(
  player: PlayerForecastInput,
  priorScores: number[],
  zeroWinner: boolean
): Sampler | null {
  const relevant = (records: GameRecord[]) =>
    records.filter((r) => !zeroWinner || !r.won).map((r) => r.score);
  const today = relevant(player.today);
  const history = relevant(player.history);
  return weightedSampler([
    { values: today, weight: today.length * TODAY_WEIGHT },
    { values: history, weight: history.length },
    { values: priorScores, weight: PRIOR_PSEUDO_GAMES },
  ]);
}

export function gameWinStrength(player: PlayerForecastInput, playerCount: number): number {
  const wins = (records: GameRecord[]) => records.filter((r) => r.won).length;
  const baseRate = 1 / Math.max(playerCount, 1);
  const weightedWins =
    wins(player.history) + TODAY_WEIGHT * wins(player.today) + PRIOR_PSEUDO_GAMES * baseRate;
  const weightedGames =
    player.history.length + TODAY_WEIGHT * player.today.length + PRIOR_PSEUDO_GAMES;
  return weightedWins / weightedGames;
}

function pickWeighted(weights: number[], totalWeight: number, rng: () => number): number {
  let pick = rng() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    if (pick < weights[i]) return i;
    pick -= weights[i];
  }
  return weights.length - 1;
}

function bestIndices(totals: number[], rankPreference: RankPreference): number[] {
  const best = rankPreference === 'lowest-first' ? Math.min(...totals) : Math.max(...totals);
  return totals.flatMap((total, index) => (total === best ? [index] : []));
}

export function forecastWinProbabilities(
  players: PlayerForecastInput[],
  options: ForecastOptions
): PlayerWinProbability[] | null {
  if (players.length === 0) return null;
  const { remainingGames, rankPreference, zeroWinner, priorScores, seed } = options;
  const simulations = remainingGames > 0 ? (options.simulations ?? DEFAULT_SIMULATIONS) : 1;

  const samplers = players.map((p) => scoreSampler(p, priorScores, zeroWinner));
  if (remainingGames > 0 && samplers.some((s) => s === null)) return null;

  const strengths = players.map((p) => gameWinStrength(p, players.length));
  const totalStrength = strengths.reduce((sum, s) => sum + s, 0);
  const rng = createRng(seed);
  const wins = new Array(players.length).fill(0);
  const finalTotals = new Array(players.length).fill(0);

  for (let run = 0; run < simulations; run++) {
    const totals = players.map((p) => p.currentTotal);
    for (let game = 0; game < remainingGames; game++) {
      const winner = zeroWinner ? pickWeighted(strengths, totalStrength, rng) : -1;
      for (let i = 0; i < players.length; i++) {
        if (i === winner) continue;
        totals[i] += samplers[i]!(rng);
      }
    }
    const leaders = bestIndices(totals, rankPreference);
    for (const index of leaders) wins[index] += 1 / leaders.length;
    totals.forEach((total, i) => (finalTotals[i] += total));
  }

  return players.map((player, i) => ({
    playerId: player.playerId,
    winProbability: wins[i] / simulations,
    expectedTotal: finalTotals[i] / simulations,
  }));
}
