export const START_RATING = 1200;
export const BASE_K = 32;
export const ELO_SCALE = 400;
export const ROUNDS_WEIGHT_BASE = 0.3;
export const ROUNDS_WEIGHT_PER_ROUND = 0.1;
export const MAX_ROUNDS_WEIGHT = 2;

const WIN_SCORE = 1;
const TIE_SCORE = 0.5;
const LOSS_SCORE = 0;

export interface RatedParticipant {
  playerId: string;
  position: number;
  isDnf: boolean;
}

export interface RatedMatch {
  matchId: string;
  endedAt: Date;
  roundsPlayed: number;
  participants: RatedParticipant[];
}

export interface RatingState {
  rating: number;
  peakRating: number;
  ratedMatches: number;
  lastDelta: number;
  lastMatchId: string | null;
}

export function roundsWeight(rounds: number): number {
  if (rounds <= 0) return 0;
  return Math.min(MAX_ROUNDS_WEIGHT, ROUNDS_WEIGHT_BASE + ROUNDS_WEIGHT_PER_ROUND * rounds);
}

export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - rating) / ELO_SCALE));
}

function pairScore(position: number, opponentPosition: number): number {
  if (position < opponentPosition) return WIN_SCORE;
  if (position === opponentPosition) return TIE_SCORE;
  return LOSS_SCORE;
}

export function effectivePositions(participants: RatedParticipant[]): Map<string, number> {
  const activePositions = participants.filter((p) => !p.isDnf).map((p) => p.position);
  const dnfPosition = (activePositions.length > 0 ? Math.max(...activePositions) : 0) + 1;
  return new Map(
    participants.map((p) => [p.playerId, p.isDnf ? dnfPosition : p.position])
  );
}

export function computeMatchDeltas(
  ratings: ReadonlyMap<string, number>,
  participants: RatedParticipant[],
  roundsPlayed: number
): Map<string, number> {
  const deltas = new Map<string, number>(participants.map((p) => [p.playerId, 0]));
  if (participants.length < 2) return deltas;

  const positions = effectivePositions(participants);
  const kFactor = (BASE_K * roundsWeight(roundsPlayed)) / (participants.length - 1);
  const ratingOf = (playerId: string) => ratings.get(playerId) ?? START_RATING;

  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const a = participants[i].playerId;
      const b = participants[j].playerId;
      const actual = pairScore(positions.get(a)!, positions.get(b)!);
      const change = kFactor * (actual - expectedScore(ratingOf(a), ratingOf(b)));
      deltas.set(a, deltas.get(a)! + change);
      deltas.set(b, deltas.get(b)! - change);
    }
  }

  return deltas;
}

function byEndedAtThenId(a: RatedMatch, b: RatedMatch): number {
  const timeCompare = a.endedAt.getTime() - b.endedAt.getTime();
  if (timeCompare !== 0) return timeCompare;
  return a.matchId < b.matchId ? -1 : a.matchId > b.matchId ? 1 : 0;
}

export interface RatingHistoryPoint {
  matchId: string;
  endedAt: Date;
  rating: number;
  delta: number;
}

type RatedMatchListener = (playerId: string, match: RatedMatch, state: RatingState) => void;

export function replayRatings(
  matches: RatedMatch[],
  onRated?: RatedMatchListener
): Map<string, RatingState> {
  const exactRatings = new Map<string, number>();
  const states = new Map<string, RatingState>();

  for (const match of [...matches].sort(byEndedAtThenId)) {
    if (match.participants.length < 2 || match.roundsPlayed <= 0) continue;

    const deltas = computeMatchDeltas(exactRatings, match.participants, match.roundsPlayed);

    for (const [playerId, delta] of Array.from(deltas)) {
      const before = exactRatings.get(playerId) ?? START_RATING;
      const after = before + delta;
      exactRatings.set(playerId, after);

      const previous = states.get(playerId);
      const shownBefore = Math.round(before);
      const shownAfter = Math.round(after);
      const state: RatingState = {
        rating: shownAfter,
        peakRating: Math.max(previous?.peakRating ?? START_RATING, shownAfter),
        ratedMatches: (previous?.ratedMatches ?? 0) + 1,
        lastDelta: shownAfter - shownBefore,
        lastMatchId: match.matchId,
      };
      states.set(playerId, state);
      onRated?.(playerId, match, state);
    }
  }

  return states;
}

export function ratingHistoryFor(matches: RatedMatch[], playerId: string): RatingHistoryPoint[] {
  const history: RatingHistoryPoint[] = [];
  replayRatings(matches, (ratedPlayerId, match, state) => {
    if (ratedPlayerId !== playerId) return;
    history.push({
      matchId: match.matchId,
      endedAt: match.endedAt,
      rating: state.rating,
      delta: state.lastDelta,
    });
  });
  return history;
}

export function matchRatingDeltas(matches: RatedMatch[], matchId: string): Map<string, number> {
  const target = matches.find((match) => match.matchId === matchId);
  if (!target) return new Map();

  const upToTarget = matches.filter((match) => byEndedAtThenId(match, target) <= 0);
  const states = replayRatings(upToTarget);
  const deltas = new Map<string, number>();
  for (const { playerId } of target.participants) {
    const state = states.get(playerId);
    if (state?.lastMatchId === matchId) deltas.set(playerId, state.lastDelta);
  }
  return deltas;
}
