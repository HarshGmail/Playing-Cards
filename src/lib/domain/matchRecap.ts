import type { MatchStanding } from '@/lib/db/collections';
import { rankAmongPlayed } from './playerStats';
import { MIN_VISIBLE_STREAK, RoundScores } from './streaks';

export const PODIUM_RANKS = [1, 2, 3] as const;

const UNKNOWN_PLAYER_NAME = 'Unknown';

export interface RecapPlayer {
  playerId: string;
  name: string;
  rank: number;
  total: number;
  gamesWon: number;
  isDnf: boolean;
  ratingDelta: number | null;
}

export interface PodiumSlot {
  rank: number;
  players: RecapPlayer[];
}

export interface StreakHighlight {
  players: RecapPlayer[];
  length: number;
}

export interface RoundHighlight {
  player: RecapPlayer;
  value: number;
  round: number;
}

export interface MatchRecap {
  players: RecapPlayer[];
  winners: RecapPlayer[];
  podium: PodiumSlot[];
  longestGameStreak: StreakHighlight | null;
  biggestRound: RoundHighlight | null;
}

export interface MatchRecapInput {
  standings: MatchStanding[];
  rounds: RoundScores[];
  names: ReadonlyMap<string, string>;
  ratingDeltas: ReadonlyMap<string, number>;
}

function longestRun(standing: MatchStanding): number {
  const runs = standing.gameRuns ?? [];
  return runs.length > 0 ? Math.max(...runs) : 0;
}

function podiumSlots(finishers: RecapPlayer[]): PodiumSlot[] {
  return PODIUM_RANKS.map((rank) => ({
    rank,
    players: finishers.filter((player) => player.rank === rank),
  })).filter((slot) => slot.players.length > 0);
}

function longestGameStreak(
  standings: MatchStanding[],
  players: RecapPlayer[]
): StreakHighlight | null {
  const runByPlayer = new Map(standings.map((s) => [s.playerId, longestRun(s)]));
  const length = Math.max(0, ...Array.from(runByPlayer.values()));
  if (length < MIN_VISIBLE_STREAK) return null;
  return {
    length,
    players: players.filter((player) => runByPlayer.get(player.playerId) === length),
  };
}

function biggestRound(
  rounds: RoundScores[],
  playersById: ReadonlyMap<string, RecapPlayer>
): RoundHighlight | null {
  let best: RoundHighlight | null = null;
  for (const { round, scores } of [...rounds].sort((a, b) => a.round - b.round)) {
    for (const { playerId, value } of scores) {
      const player = playersById.get(playerId);
      if (!player || value <= 0) continue;
      if (!best || value > best.value) best = { player, value, round };
    }
  }
  return best;
}

export function buildMatchRecap({
  standings,
  rounds,
  names,
  ratingDeltas,
}: MatchRecapInput): MatchRecap {
  const ranked = rankAmongPlayed(standings);
  const players: RecapPlayer[] = ranked
    .map((standing) => ({
      playerId: standing.playerId,
      name: names.get(standing.playerId) || UNKNOWN_PLAYER_NAME,
      rank: standing.rank,
      total: standing.total,
      gamesWon: standing.gamesWon,
      isDnf: standing.isDnf,
      ratingDelta: ratingDeltas.get(standing.playerId) ?? null,
    }))
    .sort((a, b) => a.rank - b.rank);
  const finishers = players.filter((player) => !player.isDnf);
  const playersById = new Map(players.map((player) => [player.playerId, player]));

  return {
    players,
    winners: finishers.filter((player) => player.rank === 1),
    podium: podiumSlots(finishers),
    longestGameStreak: longestGameStreak(ranked, players),
    biggestRound: biggestRound(rounds, playersById),
  };
}
