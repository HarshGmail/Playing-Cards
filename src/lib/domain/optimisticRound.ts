import { computeMatchLeaderboard, type LeaderboardEntry } from '@/lib/domain/ranking';

export interface SubmittedScore {
  playerId: string;
  value: number;
}

export interface RoundScore extends SubmittedScore {
  enteredBy: string;
  enteredAt: string;
}

export interface CachedRound {
  round: number;
  scores: RoundScore[];
}

interface RosterMember {
  userId: string;
  userName: string;
  status: 'active' | 'dnf';
  dnfAfterRound: number | null;
}

interface MatchWithRoster {
  creatorId: string;
  roundsPlayed: number;
  rankPreference: 'highest-first' | 'lowest-first';
  tiebreakers: string[];
  roster: RosterMember[];
}

interface StateWithLeaderboard {
  leaderboard: unknown;
}

export interface OptimisticRoundInput<
  TMatch extends MatchWithRoster,
  TState extends StateWithLeaderboard,
> {
  match: TMatch;
  rounds: CachedRound[];
  state: TState | undefined;
  scores: SubmittedScore[];
  enteredAt: string;
}

export interface OptimisticRoundResult<
  TMatch extends MatchWithRoster,
  TState extends StateWithLeaderboard,
> {
  match: TMatch;
  rounds: CachedRound[];
  state: (Omit<TState, 'leaderboard'> & { leaderboard: LeaderboardEntry[] }) | undefined;
}

export function nextRoundNumber(match: Pick<MatchWithRoster, 'roundsPlayed'>): number {
  return match.roundsPlayed + 1;
}

export function appendRound(
  rounds: CachedRound[],
  roundNumber: number,
  scores: SubmittedScore[],
  enteredBy: string,
  enteredAt: string
): CachedRound[] {
  const submitted: CachedRound = {
    round: roundNumber,
    scores: scores.map(({ playerId, value }) => ({ playerId, value, enteredBy, enteredAt })),
  };
  return [...rounds.filter((existing) => existing.round !== roundNumber), submitted];
}

export function leaderboardFromRounds(match: MatchWithRoster, rounds: CachedRound[]) {
  const flatScores = rounds.flatMap(({ round, scores }) =>
    scores.map(({ playerId, value }) => ({ playerId, round, value }))
  );
  return computeMatchLeaderboard(
    match.roster,
    flatScores,
    match.rankPreference,
    match.tiebreakers
  );
}

export function applyOptimisticRound<
  TMatch extends MatchWithRoster,
  TState extends StateWithLeaderboard,
>({
  match,
  rounds,
  state,
  scores,
  enteredAt,
}: OptimisticRoundInput<TMatch, TState>): OptimisticRoundResult<TMatch, TState> {
  const roundNumber = nextRoundNumber(match);
  const nextRounds = appendRound(rounds, roundNumber, scores, match.creatorId, enteredAt);
  const nextMatch = { ...match, roundsPlayed: roundNumber };
  const nextState = state
    ? { ...state, leaderboard: leaderboardFromRounds(match, nextRounds) }
    : undefined;
  return { match: nextMatch, rounds: nextRounds, state: nextState };
}
