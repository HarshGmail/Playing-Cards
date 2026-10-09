export const STREAK_TIERS = [3, 4, 5, 6] as const;
export type StreakTier = (typeof STREAK_TIERS)[number];

export const STREAK_TIER_LABELS: Record<StreakTier, string> = {
  3: 'Hat-trick',
  4: 'Four in a row',
  5: 'Five in a row',
  6: 'Six in a row',
};

export const MIN_VISIBLE_STREAK = 2;
export const APP_TIME_ZONE = 'Asia/Kolkata';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type StreakCounts = Record<StreakTier, number>;

export interface RunSummary {
  longest: number;
  current: number;
  atLeast: StreakCounts;
}

export interface RoundScores {
  round: number;
  scores: Array<{ playerId: string; value: number }>;
}

export interface PlayerGameRuns {
  runs: number[];
  current: number;
}

export function emptyStreakCounts(): StreakCounts {
  return { 3: 0, 4: 0, 5: 0, 6: 0 };
}

export function runLengths(sequence: boolean[]): number[] {
  const runs: number[] = [];
  let length = 0;
  for (const won of sequence) {
    if (won) {
      length += 1;
    } else if (length > 0) {
      runs.push(length);
      length = 0;
    }
  }
  if (length > 0) runs.push(length);
  return runs;
}

export function trailingRun(sequence: boolean[]): number {
  let length = 0;
  for (let i = sequence.length - 1; i >= 0 && sequence[i]; i--) length += 1;
  return length;
}

export function countRunsAtLeast(runs: number[]): StreakCounts {
  const counts = emptyStreakCounts();
  for (const run of runs) {
    for (const tier of STREAK_TIERS) {
      if (run >= tier) counts[tier] += 1;
    }
  }
  return counts;
}

export function summarizeRuns(runs: number[], current: number): RunSummary {
  return {
    longest: runs.length > 0 ? Math.max(...runs) : 0,
    current,
    atLeast: countRunsAtLeast(runs),
  };
}

export function summarizeSequence(sequence: boolean[]): RunSummary {
  return summarizeRuns(runLengths(sequence), trailingRun(sequence));
}

export function roundWinners(
  rounds: RoundScores[],
  rankPreference: 'highest-first' | 'lowest-first'
): Array<{ round: number; playerIds: Set<string>; winners: Set<string> }> {
  return [...rounds]
    .sort((a, b) => a.round - b.round)
    .filter((r) => r.scores.length > 0)
    .map((r) => {
      const values = r.scores.map((s) => s.value);
      const best = rankPreference === 'highest-first' ? Math.max(...values) : Math.min(...values);
      return {
        round: r.round,
        playerIds: new Set(r.scores.map((s) => s.playerId)),
        winners: new Set(r.scores.filter((s) => s.value === best).map((s) => s.playerId)),
      };
    });
}

export function gameRunsByPlayer(
  rounds: RoundScores[],
  rankPreference: 'highest-first' | 'lowest-first'
): Map<string, PlayerGameRuns> {
  const sequences = new Map<string, boolean[]>();
  for (const { playerIds, winners } of roundWinners(rounds, rankPreference)) {
    for (const playerId of Array.from(playerIds)) {
      if (!sequences.has(playerId)) sequences.set(playerId, []);
      sequences.get(playerId)!.push(winners.has(playerId));
    }
  }
  return new Map(
    Array.from(sequences, ([playerId, sequence]) => [
      playerId,
      { runs: runLengths(sequence), current: trailingRun(sequence) },
    ])
  );
}

export function dayKey(date: Date, timeZone: string = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function dayIndex(key: string): number {
  return Math.round(Date.parse(`${key}T00:00:00Z`) / MS_PER_DAY);
}

export interface DayStreaks {
  longest: number;
  current: number;
  lastActiveDay: string | null;
}

export function dayStreaks(dayKeys: string[]): DayStreaks {
  const days = Array.from(new Set(dayKeys)).sort();
  if (days.length === 0) return { longest: 0, current: 0, lastActiveDay: null };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = dayIndex(days[i]) - dayIndex(days[i - 1]) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return { longest, current: run, lastActiveDay: days[days.length - 1] };
}

export function liveDayStreak(
  current: number,
  lastActiveDay: string | null,
  todayKey: string
): number {
  if (!lastActiveDay) return 0;
  const gap = dayIndex(todayKey) - dayIndex(lastActiveDay);
  return gap <= 1 ? current : 0;
}
