import { ObjectId } from 'mongodb';
import { getUsers, Match } from '@/lib/db/collections';
import { notifyMany } from './create';

export interface NotifyRoundScoredArgs {
  match: Match;
  round: number;
  scores: Array<{ playerId: string; value: number }>;
  /** The scorer. Excluded from the fan-out — they just typed these in. */
  scoredBy: string;
  /** True for a correction to an already-submitted round. */
  edited: boolean;
}

/**
 * Tell every player in a match that a round has been scored, and what they got.
 *
 * Only the scorer can enter scores, so this is the one moment a player's record
 * changes without them touching anything — worth a notification each time. These
 * carry a one-day TTL (see EPHEMERAL_NOTIFICATION_TTL_MS): a long match would
 * otherwise bury every other notification a player has.
 */
export async function notifyRoundScored({
  match,
  round,
  scores,
  scoredBy,
  edited,
}: NotifyRoundScoredArgs): Promise<void> {
  const recipients = match.roster
    .map((r) => r.userId)
    .filter((id) => id !== scoredBy);

  if (recipients.length === 0) return;

  const usersCol = await getUsers();
  const scorer = ObjectId.isValid(scoredBy)
    ? await usersCol.findOne({ _id: new ObjectId(scoredBy) })
    : null;

  const valueByPlayerId = new Map(scores.map((s) => [s.playerId, s.value]));
  const matchId = match._id?.toString();

  await notifyMany(
    recipients.map((userId) => ({
      userId,
      type: 'round-scored' as const,
      payload: {
        matchId,
        matchName: match.name,
        round,
        edited,
        scoredBy,
        scoredByName: scorer?.name || 'The scorer',
        // Absent for a player who sat the round out (DNF), which reads
        // correctly as "a round was scored" with no score of their own.
        yourScore: valueByPlayerId.get(userId) ?? null,
      },
    }))
  );
}
