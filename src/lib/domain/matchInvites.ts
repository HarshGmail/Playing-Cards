import { ObjectId, type Filter } from 'mongodb';
import { getMatches, getMatchInvites, Match, MatchInvite } from '@/lib/db/collections';
import { withTransaction } from '@/lib/db/client';
import { notifyMany, notifyUser } from '@/lib/notifications/create';
import { logError } from '@/lib/logger';
import { buildRosterEntry } from '@/lib/domain/rosterEntry';

export interface InvitePlayersArgs {
  matchId: string;
  /** Denormalised into the notification: the invitee cannot read the match yet. */
  matchName: string;
  invitedBy: string;
  invitedByName: string;
  userIds: string[];
}

export interface InvitedPlayer {
  inviteId: string;
  userId: string;
}

/**
 * Record a pending invite for each user and notify them.
 *
 * An invitee is deliberately *not* on the roster and *not* a spectator, so they
 * have no read access to the match — GET /api/matches/[id] will 403 for them
 * until they accept. Everything they need to decide (who invited them, what the
 * match is called) therefore travels in the notification payload.
 *
 * Re-inviting someone who already has a pending invite is a no-op rather than a
 * second notification, so a creator cannot use repeat invites as a nag channel.
 * Re-inviting someone who declined revives the invite and does notify again.
 */
export async function invitePlayersToMatch({
  matchId,
  matchName,
  invitedBy,
  invitedByName,
  userIds,
}: InvitePlayersArgs): Promise<InvitedPlayer[]> {
  const recipients = Array.from(new Set(userIds)).filter((id) => id !== invitedBy);
  if (recipients.length === 0) return [];

  const invitesCol = await getMatchInvites();

  const existing = await invitesCol
    .find({ matchId, userId: { $in: recipients } })
    .toArray();
  const alreadyPending = new Set(
    existing.filter((i) => i.status === 'pending').map((i) => i.userId)
  );

  await invitesCol.bulkWrite(
    recipients.map((userId) => ({
      updateOne: {
        filter: { matchId, userId },
        update: {
          $set: {
            status: 'pending' as MatchInvite['status'],
            invitedBy,
            respondedAt: null,
          },
          // matchId and userId come from the filter's equality terms on insert.
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    }))
  );

  // Re-read rather than thread bulkWrite's upsertedIds through: this picks up
  // the ids of revived invites too, and it is one round trip either way.
  const pending = await invitesCol
    .find({ matchId, userId: { $in: recipients }, status: 'pending' })
    .toArray();

  const invited = pending.map((invite) => ({
    inviteId: invite._id!.toString(),
    userId: invite.userId,
  }));

  await notifyMany(
    invited
      .filter((i) => !alreadyPending.has(i.userId))
      .map((i) => ({
        userId: i.userId,
        type: 'match-invite' as const,
        payload: {
          matchId,
          matchName,
          inviteId: i.inviteId,
          invitedBy,
          invitedByName,
        },
      }))
  );

  return invited;
}

export interface RosterPlayerArgs {
  matchId: string;
  match: Pick<Match, 'roster' | 'roundsPlayed' | 'version'>;
  player: { userId: string; userName: string };
  inviteFilter: Filter<MatchInvite>;
  respondedAt: Date;
}

export async function rosterPlayerAndAcceptInvites({
  matchId,
  match,
  player,
  inviteFilter,
  respondedAt,
}: RosterPlayerArgs): Promise<{ joinedAtRound: number; version: number }> {
  const matchesCol = await getMatches();
  const invitesCol = await getMatchInvites();
  const entry = buildRosterEntry(match, player);

  await withTransaction(async (session) => {
    await matchesCol.updateOne(
      {
        _id: new ObjectId(matchId),
        'roster.userId': { $ne: player.userId },
      },
      {
        $push: { roster: entry },
        $inc: { version: 1 },
      },
      { session }
    );

    await invitesCol.updateMany(
      { ...inviteFilter, status: 'pending' },
      { $set: { status: 'accepted', respondedAt } },
      { session }
    );
  });

  return { joinedAtRound: entry.joinedAtRound, version: match.version + 1 };
}

export interface ForceAddArgs {
  matchId: string;
  match: RosterPlayerArgs['match'] & { name: string };
  player: { userId: string; userName: string };
  addedByName: string;
}

export async function forceAddPlayerToMatch({
  matchId,
  match,
  player,
  addedByName,
}: ForceAddArgs): Promise<{ joinedAtRound: number; version: number }> {
  const result = await rosterPlayerAndAcceptInvites({
    matchId,
    match,
    player,
    inviteFilter: { matchId, userId: player.userId },
    respondedAt: new Date(),
  });

  await notifyUser(player.userId, 'added-to-match', {
    matchId,
    matchName: match.name,
    role: 'player',
    invitedByName: addedByName,
  }).catch((err) => logError('force-add-player', err));

  return result;
}
