import { getMatches, getScores } from '@/lib/db/collections';
import { ALL_GAMES_KEY, ratingGameFor } from '@/lib/games/catalog';
import {
  fastestRecords,
  firstReaches,
  gameWinEvents,
  matchWinEvents,
  progressOf,
  RECORD_THRESHOLDS,
  type Achievement,
  type FastestRecord,
  type PlayEvent,
  type RecordKind,
  type RecordMatch,
  type RecordProgress,
} from '@/lib/domain/fastestRecords';
import type { RecordHolder } from '@/types';
import type { PlayerIdentity } from './identities';

const RECORD_MATCH_PROJECTION = {
  status: 1,
  createdAt: 1,
  endedAt: 1,
  rankPreference: 1,
  roster: 1,
  standings: 1,
  gameType: 1,
  gameLabel: 1,
} as const;

const RECORD_SCORE_PROJECTION = { _id: 0, matchId: 1, playerId: 1, round: 1, value: 1 } as const;

export interface RecordTrack {
  records: FastestRecord[];
  reached: Map<string, Map<number, Achievement>>;
  progress: Map<string, RecordProgress>;
}

export type RecordBook = Record<RecordKind, RecordTrack>;

async function loadRecordMatches(gameKey: string): Promise<RecordMatch[]> {
  const matchesCol = await getMatches();
  const matches = await matchesCol
    .find(
      { deletedAt: null, roundsPlayed: { $gte: 1 }, standings: { $exists: true } },
      { projection: RECORD_MATCH_PROJECTION }
    )
    .toArray();
  const inFormat =
    gameKey === ALL_GAMES_KEY
      ? matches
      : matches.filter((match) => ratingGameFor(match.gameType, match.gameLabel).key === gameKey);
  const matchIds = inFormat.map((match) => match._id!.toString());
  if (matchIds.length === 0) return [];

  const scoresCol = await getScores();
  const scores = await scoresCol
    .find({ matchId: { $in: matchIds } }, { projection: RECORD_SCORE_PROJECTION })
    .toArray();
  const scoresByMatch = new Map<string, RecordMatch['scores']>();
  for (const score of scores) {
    if (!scoresByMatch.has(score.matchId)) scoresByMatch.set(score.matchId, []);
    scoresByMatch.get(score.matchId)!.push({ playerId: score.playerId, round: score.round, value: score.value });
  }

  return inFormat.map((match) => {
    const matchId = match._id!.toString();
    return {
      matchId,
      status: match.status,
      createdAt: match.createdAt,
      endedAt: match.endedAt ?? null,
      rankPreference: match.rankPreference,
      roster: match.roster.map((entry) => ({ userId: entry.userId, dnfAfterRound: entry.dnfAfterRound ?? null })),
      standings: match.standings ?? [],
      scores: scoresByMatch.get(matchId) ?? [],
    };
  });
}

function buildTrack(kind: RecordKind, events: PlayEvent[]): RecordTrack {
  const reached = firstReaches(events, RECORD_THRESHOLDS[kind]);
  return { records: fastestRecords(kind, reached), reached, progress: progressOf(events) };
}

export async function loadRecordBook(gameKey: string): Promise<RecordBook> {
  const matches = await loadRecordMatches(gameKey);
  return {
    matchWins: buildTrack('matchWins', matchWinEvents(matches)),
    gameWins: buildTrack('gameWins', gameWinEvents(matches)),
  };
}

export function toRecordHolder(achievement: Achievement, identity: PlayerIdentity): RecordHolder {
  return {
    userId: achievement.playerId,
    name: identity.name,
    username: identity.username,
    profilePicUrl: identity.profilePicUrl,
    count: achievement.count,
    at: achievement.at,
  };
}

export function recordHolderIds(book: RecordBook): string[] {
  return [...book.matchWins.records, ...book.gameWins.records].map((record) => record.holder.playerId);
}
