import { computeMatchLeaderboard } from './ranking';
import { ordinal } from './milestones';
import { gameRunsByPlayer, roundWinners } from './streaks';

export const MIN_CHEERED_STREAK = 2;

export interface MomentPlayer {
  playerId: string;
  name: string;
  position: number;
  total: number;
  isDnf: boolean;
}

export interface Movement {
  playerId: string;
  name: string;
  from: number;
  to: number;
}

export interface StreakNote {
  playerId: string;
  name: string;
  from: number;
  to: number;
}

export interface RoundMoment {
  before: MomentPlayer[];
  after: MomentPlayer[];
  climbers: Movement[];
  fallers: Movement[];
  streaks: StreakNote[];
}

function movements(before: MomentPlayer[], after: MomentPlayer[]) {
  const beforeById = new Map(before.map((player) => [player.playerId, player]));
  const climbers: Movement[] = [];
  const fallers: Movement[] = [];
  for (const player of after) {
    const previous = beforeById.get(player.playerId);
    if (!previous || player.isDnf || previous.isDnf || previous.position === player.position) continue;
    const movement = { playerId: player.playerId, name: player.name, from: previous.position, to: player.position };
    (player.position < previous.position ? climbers : fallers).push(movement);
  }
  climbers.sort((a, b) => a.to - b.to);
  fallers.sort((a, b) => a.to - b.to);
  return { climbers, fallers };
}

export function buildRoundMoment(
  before: MomentPlayer[],
  after: MomentPlayer[],
  streaksBefore: Map<string, number>,
  streaksAfter: Map<string, number>
): RoundMoment | null {
  const { climbers, fallers } = movements(before, after);
  const nameById = new Map(after.map((player) => [player.playerId, player.name]));
  const streaks: StreakNote[] = Array.from(streaksAfter)
    .filter(([playerId, count]) => count >= MIN_CHEERED_STREAK && count > (streaksBefore.get(playerId) ?? 0))
    .map(([playerId, count]) => ({
      playerId,
      name: nameById.get(playerId) ?? 'Someone',
      from: streaksBefore.get(playerId) ?? 0,
      to: count,
    }));
  if (climbers.length === 0 && fallers.length === 0 && streaks.length === 0) return null;
  return { before, after, climbers, fallers, streaks };
}

export function hasShuffle(moment: RoundMoment): boolean {
  return moment.climbers.length > 0 || moment.fallers.length > 0;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

function pick<T>(options: T[], seed: number): T {
  return options[Math.abs(seed) % options.length];
}

export function momentHeadline(moment: RoundMoment, round: number): string {
  if (moment.climbers.length > 1) {
    return `Come on, ${joinNames(moment.climbers.map((c) => firstName(c.name)))}! The table just shook.`;
  }
  const [climber] = moment.climbers;
  if (climber) {
    const name = firstName(climber.name);
    const place = ordinal(climber.to);
    return pick(
      [`Come on, ${name}! Up to ${place}.`, `${name} is on the move — ${place} now!`, `Look at ${name} go! ${place} place.`],
      round
    );
  }
  const [streak] = moment.streaks;
  return streak ? streakCheer(streak, round) : '';
}

export function momentSubline(moment: RoundMoment): string | null {
  if (moment.fallers.length === 0) return null;
  const names = joinNames(moment.fallers.map((faller) => firstName(faller.name)));
  return `${names}, it's not over — gear up!`;
}

export function streakCheer(note: StreakNote, round: number): string {
  const name = firstName(note.name);
  return pick(
    [
      `Come on, ${name} — ${note.to} in a row, let's go!`,
      `${name} is on fire — ${note.to} straight!`,
      `${note.to} in a row for ${name}. Unstoppable!`,
    ],
    round
  );
}

export interface RoundContext {
  wonRound: boolean;
  wrongShow: boolean;
  tookLead: boolean;
  climbed: boolean;
  dropped: boolean;
}

export function milestoneTagline(context: RoundContext): string {
  if (context.wrongShow) return "Not the ideal way to get there — but come on, show 'em who you are!";
  if (context.tookLead) return 'Took the lead too. What a way to get there!';
  if (context.wonRound || context.climbed) return 'What a way to get there!';
  if (context.dropped) return "Tough round, but this one's yours forever. Keep pushing!";
  return 'One more for the collection. Keep it rolling!';
}

interface ContextRosterEntry {
  userId: string;
  userName: string;
  status: 'active' | 'dnf';
  dnfAfterRound: number | null;
}

interface ContextRound {
  round: number;
  scores: Array<{ playerId: string; value: number; wrongShow?: boolean }>;
}

function positionsAfter(
  rounds: ContextRound[],
  roster: ContextRosterEntry[],
  rankPreference: 'highest-first' | 'lowest-first',
  tiebreakers: string[]
): Map<string, number> {
  const flat = rounds.flatMap(({ round, scores }) => scores.map(({ playerId, value }) => ({ playerId, round, value })));
  const leaderboard = computeMatchLeaderboard(roster, flat, rankPreference, tiebreakers);
  return new Map(leaderboard.filter((entry) => !entry.isDnf).map((entry) => [entry.playerId, entry.position]));
}

function momentPlayersAfter(
  rounds: ContextRound[],
  roster: ContextRosterEntry[],
  rankPreference: 'highest-first' | 'lowest-first',
  tiebreakers: string[]
): MomentPlayer[] {
  const nameById = new Map(roster.map((entry) => [entry.userId, entry.userName]));
  const flat = rounds.flatMap(({ round, scores }) => scores.map(({ playerId, value }) => ({ playerId, round, value })));
  return computeMatchLeaderboard(roster, flat, rankPreference, tiebreakers)
    .filter((entry) => entry.roundsPlayed > 0)
    .map((entry) => ({
      playerId: entry.playerId,
      name: nameById.get(entry.playerId) ?? 'Unknown',
      position: entry.position,
      total: entry.total,
      isDnf: entry.isDnf,
    }));
}

function currentStreaks(rounds: ContextRound[], rankPreference: 'highest-first' | 'lowest-first'): Map<string, number> {
  return new Map(Array.from(gameRunsByPlayer(rounds, rankPreference), ([playerId, runs]) => [playerId, runs.current]));
}

export function latestRoundNumber(rounds: Array<{ round: number }>): number {
  return rounds.reduce((latest, round) => Math.max(latest, round.round), 0);
}

export function momentFromRounds(
  rounds: ContextRound[],
  roster: ContextRosterEntry[],
  rankPreference: 'highest-first' | 'lowest-first',
  tiebreakers: string[]
): RoundMoment | null {
  const ordered = [...rounds].sort((a, b) => a.round - b.round);
  if (ordered.length < 2) return null;
  const previous = ordered.slice(0, -1);
  return buildRoundMoment(
    momentPlayersAfter(previous, roster, rankPreference, tiebreakers),
    momentPlayersAfter(ordered, roster, rankPreference, tiebreakers),
    currentStreaks(previous, rankPreference),
    currentStreaks(ordered, rankPreference)
  );
}

export function roundContextFor(
  playerId: string,
  rounds: ContextRound[],
  roster: ContextRosterEntry[],
  rankPreference: 'highest-first' | 'lowest-first',
  tiebreakers: string[]
): RoundContext {
  const ordered = [...rounds].sort((a, b) => a.round - b.round);
  const last = ordered[ordered.length - 1];
  if (!last) return { wonRound: false, wrongShow: false, tookLead: false, climbed: false, dropped: false };
  const before = positionsAfter(ordered.slice(0, -1), roster, rankPreference, tiebreakers).get(playerId);
  const after = positionsAfter(ordered, roster, rankPreference, tiebreakers).get(playerId);
  const winners = roundWinners([last], rankPreference)[0]?.winners ?? new Set<string>();
  return {
    wonRound: winners.has(playerId),
    wrongShow: last.scores.some((score) => score.playerId === playerId && score.wrongShow),
    tookLead: after === 1 && before !== undefined && before !== 1,
    climbed: before !== undefined && after !== undefined && after < before,
    dropped: before !== undefined && after !== undefined && after > before,
  };
}
