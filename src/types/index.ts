export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  dob?: string;
}

export interface Match {
  id: string;
  name: string;
  creatorId: string;
  creatorRole: 'score-only' | 'score-and-play';
  rankPreference: 'highest-first' | 'lowest-first';
  status: 'active' | 'ended';
  tiebreakers: string[];
  roster: RosterEntry[];
  roundsPlayed: number;
  version: number;
  createdAt: string;
  endedAt: string | null;
}

export interface RosterEntry {
  userId: string;
  userName: string;
  joinedAtRound: number;
  status: 'active' | 'dnf';
  dnfAfterRound: number | null;
  order: number;
}

export interface Score {
  id: string;
  matchId: string;
  round: number;
  playerId: string;
  value: number;
  enteredAt: string;
}

export interface LeaderboardEntry {
  position: number;
  playerId: string;
  name: string;
  total: number;
  average: number;
  stdDev: number;
  roundsPlayed: number;
  gapToLeader: number;
  gapToAhead: number | null;
  isDnf: boolean;
  isSharedPosition: boolean;
  isLast: boolean;
}

export interface MatchState {
  match: Match;
  roster: RosterEntry[];
  scores: Score[];
  leaderboard: LeaderboardEntry[];
  version: number;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}
