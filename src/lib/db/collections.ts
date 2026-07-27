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

export interface Match {
  _id?: { toString(): string };
  name: string;
  nameLower: string;
  creatorId: string;
  creatorRole: 'score-only' | 'score-and-play';
  rankPreference: 'highest-first' | 'lowest-first';
  status: 'active' | 'ended';
  deletedAt: Date | null;
  tiebreakers: string[];
  roster: RosterEntry[];
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

export interface ShareLink {
  _id?: { toString(): string };
  matchId: string;
  code: string;
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
    | 'match-ended';
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
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

export async function getShareLinks(): Promise<Collection<ShareLink>> {
  const db = await getDb();
  return db.collection<ShareLink>('shareLinks');
}

export async function getNotifications(): Promise<Collection<Notification>> {
  const db = await getDb();
  return db.collection<Notification>('notifications');
}
