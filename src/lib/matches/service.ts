import { ObjectId } from 'mongodb';
import {
  getFriendships,
  getMatches,
  getScores,
  getUsers,
  Match,
  RosterEntry,
} from '@/lib/db/collections';
import { withTransaction } from '@/lib/db/client';
import { logError } from '@/lib/logger';
import { CreateMatchInput } from '@/lib/schemas/match';
import { invitePlayersToMatch } from '@/lib/domain/matchInvites';
import { computeMatchLeaderboard, LeaderboardEntry } from '@/lib/domain/ranking';
import { notifyUsers } from '@/lib/notifications/create';
import { notifyRoundScored } from '@/lib/notifications/roundScored';
import { onMatchEnded, onRoundsChanged } from '@/lib/events/matchEvents';
import { computeWinForecast, WinForecast } from '@/lib/stats/winProbability';

export class MatchServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'MatchServiceError';
  }
}

export interface MatchPlayer {
  userId: string;
  username: string;
  name: string;
}

export interface RoundScore {
  playerId: string;
  value: number;
}

export interface CreatedMatch {
  id: string;
  name: string;
  creatorId: string;
  status: Match['status'];
  invitedCount: number;
}

export interface SubmittedRound {
  matchId: string;
  round: number;
  scoreCount: number;
  version: number;
}

export interface StandingRow {
  position: number;
  player: MatchPlayer;
  total: number;
  gamesWon: number;
  roundsPlayed: number;
  isDnf: boolean;
}

export interface MatchStandingsView {
  id: string;
  name: string;
  status: Match['status'];
  roundsPlayed: number;
  targetRounds: number | null;
  standings: StandingRow[];
  winForecast: WinForecast | null;
}

export interface MatchListItem {
  id: string;
  name: string;
  status: Match['status'];
  roundsPlayed: number;
  createdAt: Date;
  endedAt: Date | null;
  players: string[];
}

const NOT_FOUND = () => new MatchServiceError(404, 'NOT_FOUND', 'Not found');
const FORBIDDEN = () => new MatchServiceError(403, 'FORBIDDEN', 'Forbidden');

const PLAYER_PROJECTION = { username: 1, name: 1 } as const;

function toMatchPlayer(user: { _id?: { toString(): string }; username: string; name: string }): MatchPlayer {
  return { userId: user._id!.toString(), username: user.username, name: user.name };
}

function validObjectIds(ids: string[]): ObjectId[] {
  return ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
}

async function findMatchDocument(matchId: string) {
  if (!ObjectId.isValid(matchId)) throw NOT_FOUND();
  const matches = await getMatches();
  const match = await matches.findOne({ _id: new ObjectId(matchId), deletedAt: null });
  if (!match) throw NOT_FOUND();
  return match;
}

async function loadPlayers(userIds: string[]): Promise<Map<string, MatchPlayer>> {
  const ids = validObjectIds(userIds);
  if (ids.length === 0) return new Map();
  const users = await getUsers();
  const docs = await users
    .find({ _id: { $in: ids } }, { projection: PLAYER_PROJECTION })
    .toArray();
  return new Map(docs.map((doc) => [doc._id!.toString(), toMatchPlayer(doc)]));
}

function activeRosterEntries(roster: RosterEntry[]): RosterEntry[] {
  return roster.filter((entry) => entry.status === 'active');
}

export async function findUsersByUsername(usernames: string[]): Promise<MatchPlayer[]> {
  if (usernames.length === 0) return [];
  const users = await getUsers();
  const docs = await users
    .find({ username: { $in: usernames } }, { projection: PLAYER_PROJECTION })
    .toArray();
  return docs.map(toMatchPlayer);
}

export async function listFriends(userId: string): Promise<MatchPlayer[]> {
  const friendships = await getFriendships();
  const links = await friendships.find({ $or: [{ userA: userId }, { userB: userId }] }).toArray();
  const friendIds = links.map((link) => (link.userA === userId ? link.userB : link.userA));
  const users = await getUsers();
  const docs = await users
    .find({ _id: { $in: validObjectIds(friendIds) } }, { projection: PLAYER_PROJECTION })
    .toArray();
  return docs.map(toMatchPlayer);
}

export async function createMatch(userId: string, input: CreateMatchInput): Promise<CreatedMatch> {
  const matchesCol = await getMatches();
  const usersCol = await getUsers();

  const invitedIds = Array.from(new Set(input.players)).filter((id) => id !== userId);
  const playerIds = [userId, ...invitedIds];

  if (playerIds.some((id) => !ObjectId.isValid(id))) {
    throw new MatchServiceError(400, 'INVALID_PLAYERS', 'Some players not found');
  }

  const players = await usersCol
    .find({ _id: { $in: playerIds.map((id) => new ObjectId(id)) } })
    .toArray();

  if (players.length !== playerIds.length) {
    throw new MatchServiceError(400, 'INVALID_PLAYERS', 'Some players not found');
  }

  if (invitedIds.length === 0) {
    throw new MatchServiceError(400, 'INVALID_PLAYERS', 'Invite at least one other player');
  }

  const creator = players.find((p) => p._id?.toString() === userId);

  const roster = [
    {
      userId,
      userName: creator?.name || '',
      joinedAtRound: 1,
      status: 'active' as const,
      dnfAfterRound: null,
      order: 0,
    },
  ];

  const spectatorIds = input.spectatorIds.filter((id) => !playerIds.includes(id));
  const spectatorUsers = spectatorIds.length
    ? await usersCol.find({ _id: { $in: spectatorIds.map((id) => new ObjectId(id)) } }).toArray()
    : [];

  if (spectatorUsers.length !== spectatorIds.length) {
    throw new MatchServiceError(400, 'INVALID_SPECTATORS', 'Some spectators not found');
  }

  const spectators = spectatorIds.map((spectatorId) => {
    const spectator = spectatorUsers.find((s) => s._id?.toString() === spectatorId);
    return { userId: spectatorId, userName: spectator?.name || '' };
  });

  const matchDoc: Match = {
    name: input.name,
    nameLower: input.name.toLowerCase(),
    creatorId: userId,
    creatorRole: input.creatorRole,
    rankPreference: input.rankPreference,
    gameType: input.gameType,
    gameLabel: input.gameLabel,
    targetRounds: input.targetRounds,
    status: 'active',
    deletedAt: null,
    tiebreakers: input.tiebreakers,
    roster,
    spectators,
    roundsPlayed: 0,
    version: 1,
    createdAt: new Date(),
    endedAt: null,
  };

  const result = await matchesCol.insertOne(matchDoc);
  const matchId = result.insertedId.toString();

  const invited = await invitePlayersToMatch({
    matchId,
    matchName: matchDoc.name,
    invitedBy: userId,
    invitedByName: creator?.name || '',
    userIds: invitedIds,
  });

  await notifyUsers(spectatorIds, 'added-to-match', {
    matchId,
    matchName: matchDoc.name,
    role: 'spectator',
    invitedByName: creator?.name || '',
  }).catch((err) => logError('create-match', err));

  return {
    id: matchId,
    name: matchDoc.name,
    creatorId: matchDoc.creatorId,
    status: matchDoc.status,
    invitedCount: invited.length,
  };
}

export async function getActiveRoster(matchId: string, userId: string): Promise<MatchPlayer[]> {
  const match = await findMatchDocument(matchId);
  if (match.creatorId !== userId) throw FORBIDDEN();
  const active = activeRosterEntries(match.roster);
  const players = await loadPlayers(active.map((entry) => entry.userId));
  return active.map(
    (entry) => players.get(entry.userId) ?? { userId: entry.userId, username: '', name: entry.userName }
  );
}

export async function submitRound({
  matchId,
  userId,
  scores,
}: {
  matchId: string;
  userId: string;
  scores: RoundScore[];
}): Promise<SubmittedRound> {
  const match = await findMatchDocument(matchId);

  if (match.creatorId !== userId) throw FORBIDDEN();

  const activePlayerIds = activeRosterEntries(match.roster).map((entry) => entry.userId);

  if (activePlayerIds.length < 2) {
    throw new MatchServiceError(
      409,
      'NOT_ENOUGH_PLAYERS',
      'A round needs at least two active players — wait for your invites to be accepted.'
    );
  }

  const submittedPlayerIds = new Set(scores.map((score) => score.playerId));

  if (activePlayerIds.some((playerId) => !submittedPlayerIds.has(playerId))) {
    throw new MatchServiceError(400, 'INCOMPLETE_SCORES', 'Missing scores for active players');
  }

  if (Array.from(submittedPlayerIds).some((playerId) => !activePlayerIds.includes(playerId))) {
    throw new MatchServiceError(400, 'INVALID_PLAYERS', 'Scores for non-active players');
  }

  const nextRound = match.roundsPlayed + 1;
  const matchesCol = await getMatches();
  const scoresCol = await getScores();

  const scoreDocuments = scores.map((score) => ({
    matchId,
    round: nextRound,
    playerId: score.playerId,
    value: score.value,
    enteredBy: userId,
    enteredAt: new Date(),
    editHistory: [],
  }));

  await withTransaction(async (session) => {
    await scoresCol.insertMany(scoreDocuments, { session });
    await matchesCol.updateOne(
      { _id: new ObjectId(matchId) },
      {
        $set: { roundsPlayed: nextRound },
        $inc: { version: 1 },
      },
      { session }
    );
  });

  await notifyRoundScored({
    match,
    round: nextRound,
    scores,
    scoredBy: userId,
    edited: false,
  }).catch((err) => logError('submit-round', err));

  await onRoundsChanged(matchId).catch((err) => logError('submit-round', err));

  return {
    matchId,
    round: nextRound,
    scoreCount: scoreDocuments.length,
    version: match.version + 1,
  };
}

export async function endMatch({
  matchId,
  userId,
}: {
  matchId: string;
  userId: string;
}): Promise<{ matchId: string; status: 'ended'; endedAt: Date }> {
  const match = await findMatchDocument(matchId);

  if (match.creatorId !== userId) throw FORBIDDEN();

  if (match.status === 'ended') {
    throw new MatchServiceError(409, 'ALREADY_ENDED', 'Match already ended');
  }

  const endedAt = new Date();
  const matchesCol = await getMatches();
  await matchesCol.updateOne(
    { _id: new ObjectId(matchId) },
    { $set: { status: 'ended', endedAt }, $inc: { version: 1 } }
  );

  await onMatchEnded(matchId).catch((err) => logError('end-match', err));

  return { matchId, status: 'ended', endedAt };
}

export async function getMatchStandings({
  matchId,
  userId,
  withWinForecast,
}: {
  matchId: string;
  userId: string;
  withWinForecast: boolean;
}): Promise<MatchStandingsView> {
  const match = await findMatchDocument(matchId);

  const canView =
    match.creatorId === userId ||
    match.roster.some((entry) => entry.userId === userId) ||
    (match.spectators ?? []).some((spectator) => spectator.userId === userId);
  if (!canView) throw FORBIDDEN();

  const scoresCol = await getScores();
  const scores = await scoresCol
    .find({ matchId }, { projection: { _id: 0, playerId: 1, round: 1, value: 1 } })
    .toArray();

  const leaderboard: LeaderboardEntry[] = computeMatchLeaderboard(
    match.roster,
    scores,
    match.rankPreference,
    match.tiebreakers
  );
  const players = await loadPlayers(leaderboard.map((entry) => entry.playerId));

  const winForecast =
    withWinForecast && match.status === 'active' ? await computeWinForecast(matchId, match) : null;

  return {
    id: matchId,
    name: match.name,
    status: match.status,
    roundsPlayed: match.roundsPlayed,
    targetRounds: match.targetRounds ?? null,
    standings: leaderboard.map((entry) => ({
      position: entry.position,
      player: players.get(entry.playerId) ?? { userId: entry.playerId, username: '', name: entry.name },
      total: entry.total,
      gamesWon: entry.gamesWon,
      roundsPlayed: entry.roundsPlayed,
      isDnf: entry.isDnf,
    })),
    winForecast,
  };
}

export async function listUserMatches({
  userId,
  status,
  limit,
}: {
  userId: string;
  status: Match['status'];
  limit: number;
}): Promise<MatchListItem[]> {
  const matchesCol = await getMatches();
  const docs = await matchesCol
    .find(
      {
        $or: [{ creatorId: userId }, { 'roster.userId': userId }],
        deletedAt: null,
        status,
      },
      { projection: { name: 1, status: 1, roundsPlayed: 1, createdAt: 1, endedAt: 1, roster: 1 } }
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map((doc) => ({
    id: doc._id!.toString(),
    name: doc.name,
    status: doc.status,
    roundsPlayed: doc.roundsPlayed,
    createdAt: doc.createdAt,
    endedAt: doc.endedAt,
    players: activeRosterEntries(doc.roster).map((entry) => entry.userName),
  }));
}
