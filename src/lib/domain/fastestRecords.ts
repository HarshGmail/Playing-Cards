import type { MatchStanding } from '@/lib/db/collections';
import { rankAmongPlayed, roundScoresWithinCutoff, type RosterCutoff } from './playerStats';
import { roundWinners } from './streaks';

export type RecordKind = 'matchWins' | 'gameWins';

export const RECORD_THRESHOLDS: Record<RecordKind, number[]> = {
  matchWins: [1, 5, 10, 25, 50],
  gameWins: [10, 25, 50, 100, 200, 500],
};

export const MAX_GAME_WINS_AWAY = 5;

export interface RecordMatch {
  matchId: string;
  status: 'active' | 'ended';
  createdAt: Date | string;
  endedAt: Date | string | null;
  rankPreference: 'highest-first' | 'lowest-first';
  roster: RosterCutoff[];
  standings: MatchStanding[];
  scores: Array<{ playerId: string; round: number; value: number }>;
}

export interface PlayEvent {
  playerId: string;
  won: boolean;
  at: string;
  matchId: string;
}

export interface Achievement {
  playerId: string;
  count: number;
  at: string;
  matchId: string;
  sequence: number;
}

export interface FastestRecord {
  kind: RecordKind;
  threshold: number;
  holder: Achievement;
}

export interface RecordProgress {
  wins: number;
  played: number;
}

export interface RecordChance {
  kind: RecordKind;
  threshold: number;
  playerId: string;
  winsNeeded: number;
  withinGames: number | null;
  newCount: number;
  record: Achievement | null;
}

function isoOf(value: Date | string): string {
  return new Date(value).toISOString();
}

function finishersOf(match: RecordMatch) {
  return rankAmongPlayed(match.standings).filter((standing) => !standing.isDnf);
}

export function matchWinEvents(matches: RecordMatch[]): PlayEvent[] {
  return matches
    .filter((match) => match.status === 'ended' && match.endedAt)
    .sort((a, b) => Date.parse(isoOf(a.endedAt!)) - Date.parse(isoOf(b.endedAt!)))
    .flatMap((match) =>
      finishersOf(match).map((standing) => ({
        playerId: standing.playerId,
        won: standing.rank === 1,
        at: isoOf(match.endedAt!),
        matchId: match.matchId,
      }))
    );
}

export function gameWinEvents(matches: RecordMatch[]): PlayEvent[] {
  return [...matches]
    .sort((a, b) => Date.parse(isoOf(a.createdAt)) - Date.parse(isoOf(b.createdAt)))
    .flatMap((match) => {
      const finishers = new Set(finishersOf(match).map((standing) => standing.playerId));
      const rounds = roundWinners(roundScoresWithinCutoff(match.roster, match.scores), match.rankPreference);
      return rounds.flatMap(({ playerIds, winners }) =>
        Array.from(playerIds)
          .filter((playerId) => finishers.has(playerId))
          .map((playerId) => ({
            playerId,
            won: winners.has(playerId),
            at: isoOf(match.createdAt),
            matchId: match.matchId,
          }))
      );
    });
}

export function firstReaches(
  chronologicalEvents: PlayEvent[],
  thresholds: number[]
): Map<string, Map<number, Achievement>> {
  const wanted = new Set(thresholds);
  const progress = new Map<string, RecordProgress>();
  const reached = new Map<string, Map<number, Achievement>>();

  chronologicalEvents.forEach((event, sequence) => {
    const counts = progress.get(event.playerId) ?? { wins: 0, played: 0 };
    counts.played += 1;
    if (event.won) counts.wins += 1;
    progress.set(event.playerId, counts);
    if (!event.won || !wanted.has(counts.wins)) return;
    if (!reached.has(event.playerId)) reached.set(event.playerId, new Map());
    reached.get(event.playerId)!.set(counts.wins, {
      playerId: event.playerId,
      count: counts.played,
      at: event.at,
      matchId: event.matchId,
      sequence,
    });
  });

  return reached;
}

export function progressOf(chronologicalEvents: PlayEvent[]): Map<string, RecordProgress> {
  const progress = new Map<string, RecordProgress>();
  for (const event of chronologicalEvents) {
    const counts = progress.get(event.playerId) ?? { wins: 0, played: 0 };
    counts.played += 1;
    if (event.won) counts.wins += 1;
    progress.set(event.playerId, counts);
  }
  return progress;
}

export function reachedBy(
  reached: Map<string, Map<number, Achievement>>,
  playerIds: Set<string>
): Map<string, Map<number, Achievement>> {
  return new Map(Array.from(reached).filter(([playerId]) => playerIds.has(playerId)));
}

function isFaster(candidate: Achievement, current: Achievement | undefined): boolean {
  if (!current) return true;
  if (candidate.count !== current.count) return candidate.count < current.count;
  return candidate.sequence < current.sequence;
}

export function fastestRecords(
  kind: RecordKind,
  reached: Map<string, Map<number, Achievement>>
): FastestRecord[] {
  return RECORD_THRESHOLDS[kind].flatMap((threshold) => {
    let best: Achievement | undefined;
    reached.forEach((byThreshold) => {
      const achievement = byThreshold.get(threshold);
      if (achievement && isFaster(achievement, best)) best = achievement;
    });
    return best ? [{ kind, threshold, holder: best }] : [];
  });
}

function recordFor(records: FastestRecord[], threshold: number): Achievement | null {
  return records.find((record) => record.threshold === threshold)?.holder ?? null;
}

function matchWinChance(
  playerId: string,
  progress: RecordProgress,
  records: FastestRecord[]
): RecordChance | null {
  const threshold = progress.wins + 1;
  if (!RECORD_THRESHOLDS.matchWins.includes(threshold)) return null;
  const newCount = progress.played + 1;
  const record = recordFor(records, threshold);
  if (record && newCount >= record.count) return null;
  return { kind: 'matchWins', threshold, playerId, winsNeeded: 1, withinGames: null, newCount, record };
}

function gameWinChance(
  playerId: string,
  progress: RecordProgress,
  records: FastestRecord[]
): RecordChance | null {
  const threshold = RECORD_THRESHOLDS.gameWins.find((t) => t > progress.wins);
  if (threshold === undefined) return null;
  const winsNeeded = threshold - progress.wins;
  if (winsNeeded > MAX_GAME_WINS_AWAY) return null;
  const newCount = progress.played + winsNeeded;
  const record = recordFor(records, threshold);
  if (record && newCount >= record.count) return null;
  const withinGames = record ? record.count - 1 - progress.played : null;
  return { kind: 'gameWins', threshold, playerId, winsNeeded, withinGames, newCount, record };
}

export interface RecordsOnTheLineInput {
  playerIds: string[];
  matchWinRecords: FastestRecord[];
  gameWinRecords: FastestRecord[];
  matchWinProgress: Map<string, RecordProgress>;
  gameWinProgress: Map<string, RecordProgress>;
}

export function recordsOnTheLine({
  playerIds,
  matchWinRecords,
  gameWinRecords,
  matchWinProgress,
  gameWinProgress,
}: RecordsOnTheLineInput): RecordChance[] {
  const empty: RecordProgress = { wins: 0, played: 0 };
  return playerIds.flatMap((playerId) =>
    [
      matchWinChance(playerId, matchWinProgress.get(playerId) ?? empty, matchWinRecords),
      gameWinChance(playerId, gameWinProgress.get(playerId) ?? empty, gameWinRecords),
    ].filter((chance): chance is RecordChance => chance !== null)
  );
}
