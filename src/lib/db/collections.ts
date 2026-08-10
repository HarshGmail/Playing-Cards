import { Collection } from 'mongodb';
import { getDb } from './client';

export interface User {
  _id?: { toString(): string };
  name: string;
  username: string;
  email: string;
  phone: string;
  dob: string;
  passwordHash: string;
  profilePicUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RosterEntry {
  userId: string;
  userName: string;
  joinedAtRound: number;
  status: 'active' | 'dnf';
  dnfAfterRound: number | null;
  order: number;
}

export interface SpectatorEntry {
  userId: string;
  userName: string;
}

export interface Match {
  _id?: { toString(): string };
  name: string;
  nameLower: string;
  creatorId: string;
  creatorRole: 'score-only' | 'score-and-play';
  rankPreference: 'highest-first' | 'lowest-first';
  /**
   * Which game is being played. Optional because matches created before this
   * field existed predate it — read them through toGameType() in
   * lib/games/catalog.ts, which resolves absent values to 'least-count'.
   */
  gameType?: 'least-count' | 'other';
  /** Free-text game name, set only when gameType is 'other'. */
  gameLabel?: string | null;
  status: 'active' | 'ended';
  deletedAt: Date | null;
  tiebreakers: string[];
  roster: RosterEntry[];
  spectators: SpectatorEntry[];
  roundsPlayed: number;
  version: number;
  createdAt: Date;
  endedAt: Date | null;
}

export interface Score {
  _id?: { toString(): string };
  matchId: string;
  round: number;
  playerId: string;
  value: number;
  enteredBy: string;
  enteredAt: Date;
  editHistory: Array<{ from: number; to: number; at: Date; by: string }>;
}

export interface Friendship {
  _id?: { toString(): string };
  userA: string;
  userB: string;
  createdAt: Date;
}

export interface FriendRequest {
  _id?: { toString(): string };
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  respondedAt: Date | null;
}

export interface JoinRequest {
  _id?: { toString(): string };
  matchId: string;
  userId: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: Date;
  respondedAt: Date | null;
}

/**
 * A creator-initiated invitation to play in a match. Distinct from JoinRequest,
 * which travels the other way (a player asking the creator to let them in).
 *
 * Invites exist so that being added to a match is never something that can
 * happen *to* you: nothing lands on your career stats until you accept. Without
 * this, a creator could assemble a roster of unwitting friends, make themselves
 * scorer, enter whatever scores they liked and end the match — every player's
 * stats moved by a game they never agreed to play.
 *
 * Share-link joins deliberately skip this: following the link *is* the consent.
 */
export interface MatchInvite {
  _id?: { toString(): string };
  matchId: string;
  /** The invitee. */
  userId: string;
  /** The creator who sent it. */
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  respondedAt: Date | null;
}

export interface ShareLink {
  _id?: { toString(): string };
  matchId: string;
  code: string;
  role: 'player' | 'spectator';
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface Notification {
  _id?: { toString(): string };
  userId: string;
  type:
    | 'friend-request'
    | 'friend-accepted'
    | 'join-request'
    | 'join-approved'
    | 'join-declined'
    | 'added-to-match'
    | 'match-ended'
    | 'match-invite'
    | 'match-invite-accepted'
    | 'match-invite-declined'
    | 'round-scored';
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  /**
   * When set, a TTL index deletes this notification at that instant. Used for
   * high-volume per-round chatter, which is only interesting for a day.
   * `null` means keep forever — MongoDB's TTL monitor skips documents whose
   * indexed field is not a Date, so a null here is never collected.
   */
  expiresAt: Date | null;
}

export async function getUsers(): Promise<Collection<User>> {
  const db = await getDb();
  return db.collection<User>('users');
}

export async function getMatches(): Promise<Collection<Match>> {
  const db = await getDb();
  return db.collection<Match>('matches');
}

export async function getScores(): Promise<Collection<Score>> {
  const db = await getDb();
  return db.collection<Score>('scores');
}

export async function getFriendships(): Promise<Collection<Friendship>> {
  const db = await getDb();
  return db.collection<Friendship>('friendships');
}

export async function getFriendRequests(): Promise<Collection<FriendRequest>> {
  const db = await getDb();
  return db.collection<FriendRequest>('friendRequests');
}

export async function getJoinRequests(): Promise<Collection<JoinRequest>> {
  const db = await getDb();
  return db.collection<JoinRequest>('joinRequests');
}

export async function getMatchInvites(): Promise<Collection<MatchInvite>> {
  const db = await getDb();
  return db.collection<MatchInvite>('matchInvites');
}

export async function getShareLinks(): Promise<Collection<ShareLink>> {
  const db = await getDb();
  return db.collection<ShareLink>('shareLinks');
}

export async function getNotifications(): Promise<Collection<Notification>> {
  const db = await getDb();
  return db.collection<Notification>('notifications');
}
