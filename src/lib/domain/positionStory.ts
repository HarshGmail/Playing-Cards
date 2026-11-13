import { ordinal } from './milestones';
import type { RoundPositions } from './positionHistory';

const COMEBACK_MIN_POSITION = 3;

export interface PositionMove {
  playerId: string;
  round: number;
  from: number;
  to: number;
}

export interface PlayerTally {
  playerId: string;
  count: number;
}

export interface LeaderStreak {
  playerId: string;
  sinceRound: number;
  worstPosition: number;
  worstRound: number;
}

export interface PositionStory {
  newLeadersByRound: Map<number, Set<string>>;
  leadChanges: number;
  mostRoundsLed: PlayerTally | null;
  biggestClimb: PositionMove | null;
  biggestDrop: PositionMove | null;
  mostPositionChanges: PlayerTally | null;
  soleLeader: LeaderStreak | null;
  currentLeaderIds: string[];
}

function leadersOf(standing: RoundPositions): Set<string> {
  return new Set(
    Array.from(standing.positions)
      .filter(([, position]) => position === 1)
      .map(([playerId]) => playerId)
  );
}

function increment(counts: Map<string, number>, playerId: string): void {
  counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
}

function topTally(counts: Map<string, number>): PlayerTally | null {
  let top: PlayerTally | null = null;
  counts.forEach((count, playerId) => {
    if (!top || count > top.count) top = { playerId, count };
  });
  return top;
}

const climbSize = (move: PositionMove) => move.from - move.to;
const dropSize = (move: PositionMove) => move.to - move.from;

function currentLeaderStreak(history: RoundPositions[]): LeaderStreak | null {
  const latest = history[history.length - 1];
  if (!latest) return null;
  const leaders = Array.from(leadersOf(latest));
  if (leaders.length !== 1) return null;
  const [playerId] = leaders;

  let sinceIndex = history.length - 1;
  while (sinceIndex > 0 && history[sinceIndex - 1].positions.get(playerId) === 1) sinceIndex--;

  let worstPosition = 1;
  let worstRound = latest.round;
  history.forEach((standing) => {
    const position = standing.positions.get(playerId);
    if (position !== undefined && position >= worstPosition) {
      worstPosition = position;
      worstRound = standing.round;
    }
  });

  return { playerId, sinceRound: history[sinceIndex].round, worstPosition, worstRound };
}

export function buildPositionStory(history: RoundPositions[]): PositionStory {
  const newLeadersByRound = new Map<number, Set<string>>();
  const roundsLed = new Map<string, number>();
  const positionChanges = new Map<string, number>();
  let biggestClimb: PositionMove | null = null;
  let biggestDrop: PositionMove | null = null;

  history.forEach((current, index) => {
    const leaders = leadersOf(current);
    leaders.forEach((playerId) => increment(roundsLed, playerId));

    const previous = history[index - 1];
    if (!previous) return;

    const previousLeaders = leadersOf(previous);
    const newLeaders = Array.from(leaders).filter((playerId) => !previousLeaders.has(playerId));
    if (newLeaders.length > 0) newLeadersByRound.set(current.round, new Set(newLeaders));

    current.positions.forEach((to, playerId) => {
      const from = previous.positions.get(playerId);
      if (from === undefined || from === to) return;
      increment(positionChanges, playerId);
      const move = { playerId, round: current.round, from, to };
      if (to < from && (!biggestClimb || climbSize(move) > climbSize(biggestClimb))) {
        biggestClimb = move;
      }
      if (to > from && (!biggestDrop || dropSize(move) > dropSize(biggestDrop))) {
        biggestDrop = move;
      }
    });
  });

  const latest = history[history.length - 1];

  return {
    newLeadersByRound,
    leadChanges: newLeadersByRound.size,
    mostRoundsLed: topTally(roundsLed),
    biggestClimb,
    biggestDrop,
    mostPositionChanges: topTally(positionChanges),
    soleLeader: currentLeaderStreak(history),
    currentLeaderIds: latest ? Array.from(leadersOf(latest)) : [],
  };
}

export interface RaceHeadlineContext {
  nameOf: (playerId: string) => string;
  ended: boolean;
  firstRound: number;
  lastRound: number;
}

function describeTie(leaderIds: string[], nameOf: (playerId: string) => string, ended: boolean) {
  if (leaderIds.length > 2) return `${leaderIds.length}-way tie at the top`;
  const [first, second] = leaderIds.map(nameOf);
  return ended ? `${first} and ${second} finished level at the top` : `${first} and ${second} are level at the top`;
}

export function describeRace(
  story: PositionStory,
  { nameOf, ended, firstRound, lastRound }: RaceHeadlineContext
): string | null {
  const { soleLeader, currentLeaderIds, leadChanges } = story;
  if (currentLeaderIds.length > 1) return describeTie(currentLeaderIds, nameOf, ended);
  if (!soleLeader) return null;

  const leader = nameOf(soleLeader.playerId);
  const held = ended ? 'held' : 'has held';
  const tookLeadThisRound = soleLeader.sinceRound === lastRound && lastRound !== firstRound;

  if (leadChanges === 0 && soleLeader.sinceRound === firstRound) {
    return ended ? `${leader} led wire to wire` : `${leader} has led every round so far`;
  }

  const isComeback =
    soleLeader.worstPosition >= COMEBACK_MIN_POSITION && soleLeader.worstRound < soleLeader.sinceRound;
  if (isComeback) {
    const climb = `${leader} climbed from ${ordinal(soleLeader.worstPosition)} in R${soleLeader.worstRound}`;
    return tookLeadThisRound
      ? `${climb} to take the lead in R${lastRound}`
      : `${climb} to the top and ${held} it since R${soleLeader.sinceRound}`;
  }

  if (tookLeadThisRound) {
    return ended ? `${leader} snatched the lead in the final round` : `${leader} takes the lead in R${lastRound}`;
  }
  return `${leader} ${held} the top spot since R${soleLeader.sinceRound}`;
}
