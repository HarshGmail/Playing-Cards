import { getScores, getUsers } from '@/lib/db/collections';
import { gameTimeMessageFor, inactiveSince, usersToRemind } from '@/lib/domain/gameTimeReminder';
import { notifyMany } from './create';

async function recentlyActiveUserIds(since: Date): Promise<string[]> {
  const scoresCol = await getScores();
  return scoresCol.distinct('playerId', { enteredAt: { $gte: since } });
}

async function allUserIds(): Promise<string[]> {
  const usersCol = await getUsers();
  const users = await usersCol.find({}, { projection: { _id: 1 } }).toArray();
  return users.map((user) => user._id!.toString());
}

export async function sendGameTimeReminders(now: Date = new Date()): Promise<number> {
  const [userIds, activeIds] = await Promise.all([
    allUserIds(),
    recentlyActiveUserIds(inactiveSince(now)),
  ]);
  const recipients = usersToRemind(userIds, activeIds);
  const message = gameTimeMessageFor(now);
  await notifyMany(recipients.map((userId) => ({ userId, type: 'game-time', payload: { message } })));
  return recipients.length;
}
