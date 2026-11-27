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

const PLAY_UNITS: Record<RecordKind, [string, string]> = {
  matchWins: ['match', 'matches'],
  gameWins: ['game', 'games'],
};

export interface RecordCardSubject {
  name: string;
  isViewer: boolean;
}

export interface RecordCardInput {
  kind: RecordKind;
  threshold: number;
  holder: { name: string; count: number; isViewer: boolean; isSubject: boolean };
  subject: RecordCardSubject;
  subjectReachedCount: number | null;
  subjectProgress: { wins: number; played: number } | null;
}

export interface RecordCardCopy {
  title: string;
  holderLine: string;
  subjectLine: string;
  nudge: string | null;
}

function chaseNudge(input: RecordCardInput, progress: { wins: number; played: number }): string {
  const unit = PLAY_UNITS[input.kind];
  const winsNeeded = input.threshold - progress.wins;
  const budget = input.holder.count - 1 - progress.played;
  const wins = plural(winsNeeded, ['win', 'wins']);
  if (budget < winsNeeded) {
    return `The record is out of reach now, but ${plural(winsNeeded, ['more win', 'more wins'])} still gets there.`;
  }
  if (budget === winsNeeded) {
    return `Winning the next ${plural(winsNeeded, unit)} takes the record.`;
  }
  return `${wins} in the next ${plural(budget, unit)} takes the record.`;
}

function subjectPhrases({ name, isViewer }: RecordCardSubject) {
  return {
    label: isViewer ? 'You' : name,
    owns: isViewer ? 'This record is yours.' : `This record is ${name}'s.`,
    notPlayed: isViewer ? "You haven't played this yet." : `${name} hasn't played this yet.`,
    hasWon: isViewer ? "You've won" : `${name} has won`,
  };
}

function subjectLines(input: RecordCardInput): Pick<RecordCardCopy, 'subjectLine' | 'nudge'> {
  const unit = PLAY_UNITS[input.kind];
  const phrases = subjectPhrases(input.subject);
  if (input.holder.isSubject) {
    return { subjectLine: phrases.owns, nudge: `Anyone who gets there in fewer ${unit[1]} takes it.` };
  }
  if (input.subjectReachedCount !== null) {
    const behind = input.subjectReachedCount - input.holder.count;
    return {
      subjectLine: `${phrases.label} won ${plural(input.threshold, unit)} in ${plural(input.subjectReachedCount, unit)}.`,
      nudge: `${plural(behind, unit)} slower than the record.`,
    };
  }
  const progress = input.subjectProgress;
  if (!progress || progress.played === 0) {
    return { subjectLine: phrases.notPlayed, nudge: null };
  }
  return {
    subjectLine: `${phrases.hasWon} ${progress.wins} of ${plural(progress.played, unit)} so far.`,
    nudge: chaseNudge(input, progress),
  };
}

export function describeRecordCard(input: RecordCardInput): RecordCardCopy {
  const unit = PLAY_UNITS[input.kind];
  const holderLine = input.holder.isViewer
    ? `You won in ${plural(input.holder.count, unit)}.`
    : `${input.holder.name} won in ${plural(input.holder.count, unit)}.`;
  return {
    title: `Fastest to ${recordGoal(input.kind, input.threshold)}`,
    holderLine,
    ...subjectLines(input),
  };
}

export function describeRecordToBeat(chance: ChanceCopyInput): string {
  if (!chance.record) return 'No one has done it yet';
  return `Record: ${chance.record.name}, ${recordSpent(chance.kind, chance.record.count)}`;
}
