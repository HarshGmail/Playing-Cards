import type { RecordKind } from './fastestRecords';

interface ChanceCopyInput {
  kind: RecordKind;
  threshold: number;
  winsNeeded: number;
  withinGames: number | null;
  newCount: number;
  record: { name: string; count: number } | null;
}

const UNITS: Record<RecordKind, { goal: [string, string]; spent: [string, string] }> = {
  matchWins: { goal: ['match win', 'match wins'], spent: ['match', 'matches'] },
  gameWins: { goal: ['game win', 'game wins'], spent: ['game', 'games'] },
};

function plural(count: number, [singular, pluralForm]: [string, string]): string {
  return `${count.toLocaleString('en-IN')} ${count === 1 ? singular : pluralForm}`;
}

export function recordGoal(kind: RecordKind, threshold: number): string {
  return plural(threshold, UNITS[kind].goal);
}

export function recordSpent(kind: RecordKind, count: number): string {
  return `in ${plural(count, UNITS[kind].spent)}`;
}

function howToGetThere({ kind, winsNeeded, withinGames }: ChanceCopyInput): string {
  if (kind === 'matchWins') return 'Win this match';
  const rounds = plural(winsNeeded, ['round', 'rounds']);
  if (withinGames === null || withinGames === winsNeeded) {
    return winsNeeded === 1 ? 'Win the next round' : `Win the next ${rounds}`;
  }
  return `Win ${winsNeeded} of the next ${withinGames} rounds`;
}

export function describeChance(chance: ChanceCopyInput): string {
  const goal = `${recordGoal(chance.kind, chance.threshold)} ${recordSpent(chance.kind, chance.newCount)}`;
  return `${howToGetThere(chance)} to hit ${goal}`;
}

export function describeRecordToBeat(chance: ChanceCopyInput): string {
  if (!chance.record) return 'No one has done it yet';
  return `Record: ${chance.record.name}, ${recordSpent(chance.kind, chance.record.count)}`;
}
