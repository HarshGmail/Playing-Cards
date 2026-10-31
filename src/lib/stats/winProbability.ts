import { ObjectId } from 'mongodb';
import { getMatches, getScores, Match } from '@/lib/db/collections';
import { computeMatchLeaderboard } from '@/lib/domain/ranking';
import { APP_TIME_ZONE, dayKey } from '@/lib/domain/streaks';
import { ratingGameFor } from '@/lib/games/catalog';
import {
  forecastWinProbabilities,
  HISTORY_GAMES_PER_PLAYER,
  isZeroWinnerGame,
  seedFrom,
  targetGameCount,
  type GameRecord,
  type PlayerForecastInput,
  type PlayerWinProbability,
} from '@/lib/domain/winProbability';

const DAY_KEY_FORMAT = '%Y-%m-%d';

export interface WinForecast {
  targetRounds: number;
  gamesPlayed: number;
  targetGames: number;
  remainingGames: number;
  players: PlayerWinProbability[];
}

type ForecastMatch = Pick<
  Match,
  | 'roster'
  | 'rankPreference'
  | 'tiebreakers'
  | 'gameType'
  | 'gameLabel'
  | 'targetRounds'
  | 'roundsPlayed'
  | 'version'
>;

interface ScoreRow {
  matchId: string;
  round: number;
  playerId: string;
  value: number;
  day: string;
}

function sameGameFilter(match: ForecastMatch) {
  const game = ratingGameFor(match.gameType, match.gameLabel);
  if (match.gameType === 'other') return { gameType: 'other' as const, gameLabel: match.gameLabel };
  return game.key === 'least-count'
    ? { $or: [{ gameType: 'least-count' as const }, { gameType: { $exists: false } }] }
    : { gameType: match.gameType };
}

async function loadSameGameScores(
  match: ForecastMatch,
  matchId: string,
  playerIds: string[]
): Promise<ScoreRow[]> {
  const matchesCol = await getMatches();
  const sameGameMatches = await matchesCol
    .find(
      {
        ...sameGameFilter(match),
        rankPreference: match.rankPreference,
        deletedAt: null,
        _id: { $ne: new ObjectId(matchId) },
        'roster.userId': { $in: playerIds },
      },
      { projection: { _id: 1 } }
    )
    .toArray();
  const matchIds = [matchId, ...sameGameMatches.map((m) => m._id!.toString())];

  const scoresCol = await getScores();
  return scoresCol
    .aggregate<ScoreRow>([
      { $match: { matchId: { $in: matchIds } } },
      {
        $project: {
          _id: 0,
          matchId: 1,
          round: 1,
          playerId: 1,
          value: 1,
          day: {
            $dateToString: { format: DAY_KEY_FORMAT, date: '$enteredAt', timezone: APP_TIME_ZONE },
          },
        },
      },
    ])
    .toArray();
}

function bestScoreByGame(
  rows: ScoreRow[],
  rankPreference: Match['rankPreference']
): Map<string, number> {
  const best = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.matchId}:${row.round}`;
    const current = best.get(key);
    const isBetter =
      current === undefined ||
      (rankPreference === 'lowest-first' ? row.value < current : row.value > current);
    if (isBetter) best.set(key, row.value);
  }
  return best;
}

function buildPlayerInputs(
  rows: ScoreRow[],
  bestByGame: Map<string, number>,
  playerIds: string[],
  currentTotals: Map<string, number>,
  today: string
): PlayerForecastInput[] {
  const recordsByPlayer = new Map<string, { history: GameRecord[]; today: GameRecord[] }>(
    playerIds.map((id) => [id, { history: [], today: [] }])
  );
  const ordered = [...rows].sort((a, b) => b.day.localeCompare(a.day));
  for (const row of ordered) {
    const records = recordsByPlayer.get(row.playerId);
    if (!records) continue;
    const record = {
      score: row.value,
      won: bestByGame.get(`${row.matchId}:${row.round}`) === row.value,
    };
    if (row.day === today) records.today.push(record);
    else if (records.history.length < HISTORY_GAMES_PER_PLAYER) records.history.push(record);
  }
  return playerIds.map((playerId) => ({
    playerId,
    currentTotal: currentTotals.get(playerId) ?? 0,
    history: recordsByPlayer.get(playerId)!.history,
    today: recordsByPlayer.get(playerId)!.today,
  }));
}

export async function computeWinForecast(
  matchId: string,
  match: ForecastMatch
): Promise<WinForecast | null> {
  if (!match.targetRounds) return null;

  const activePlayers = match.roster.filter((r) => r.status === 'active');
  if (activePlayers.length < 2) return null;

  const playerIds = activePlayers.map((r) => r.userId);
  const rows = await loadSameGameScores(match, matchId, playerIds);
  const currentMatchRows = rows.filter((row) => row.matchId === matchId);

  const leaderboard = computeMatchLeaderboard(
    match.roster,
    currentMatchRows,
    match.rankPreference,
    match.tiebreakers
  );
  const currentTotals = new Map(leaderboard.map((entry) => [entry.playerId, entry.total]));

  const gamesPlayed = match.roundsPlayed;
  const targetGames = targetGameCount(match.targetRounds, activePlayers.length, gamesPlayed);
  const remainingGames = targetGames - gamesPlayed;

  const bestByGame = bestScoreByGame(rows, match.rankPreference);
  const zeroWinner = isZeroWinnerGame(Array.from(bestByGame.values()), match.rankPreference);
  const losingScores = rows
    .filter((row) => !zeroWinner || bestByGame.get(`${row.matchId}:${row.round}`) !== row.value)
    .map((row) => row.value);

  const players = forecastWinProbabilities(
    buildPlayerInputs(rows, bestByGame, playerIds, currentTotals, dayKey(new Date())),
    {
      remainingGames,
      rankPreference: match.rankPreference,
      zeroWinner,
      priorScores: losingScores,
      seed: seedFrom(`${matchId}:${match.version}`),
    }
  );
  if (!players) return null;

  return {
    targetRounds: match.targetRounds,
    gamesPlayed,
    targetGames,
    remainingGames,
    players: players.sort((a, b) => b.winProbability - a.winProbability),
  };
}
