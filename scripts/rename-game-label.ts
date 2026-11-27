import { closeMongoConnection } from '../src/lib/db/client';
import { getMatches, getNotifications, getUsers } from '../src/lib/db/collections';
import { notifyMany } from '../src/lib/notifications/create';
import { notifyMilestones } from '../src/lib/events/matchEvents';
import { rebuildAllPlayerStats } from '../src/lib/stats/playerStats';

const OLD_LABEL = 'Least Count - 2';
const NEW_LABEL = 'Least Showdown';
const OLD_LABEL_PATTERN = /least\s*count\s*-\s*2/i;
const OLD_LABEL_EXACT = /^\s*least\s*count\s*-\s*2\s*$/i;
const APPLY_FLAG = '--apply';
const ANNOUNCE_FLAG = '--announce';

const ANNOUNCEMENT = {
  title: `${OLD_LABEL} is now ${NEW_LABEL}`,
  body: `Same game, new name. Your ${NEW_LABEL} matches, ratings and records came along with it.`,
  url: '/profile',
};

function renamed(text: string): string {
  return text.replace(OLD_LABEL_PATTERN, NEW_LABEL);
}

async function renameMatches(apply: boolean): Promise<number> {
  const matchesCol = await getMatches();
  const matches = await matchesCol
    .find(
      { $or: [{ gameLabel: { $regex: OLD_LABEL_PATTERN } }, { name: { $regex: OLD_LABEL_PATTERN } }] },
      { projection: { name: 1, gameLabel: 1 } }
    )
    .toArray();

  for (const match of matches) {
    const nextName = renamed(match.name);
    const nextLabel = match.gameLabel && OLD_LABEL_EXACT.test(match.gameLabel) ? NEW_LABEL : match.gameLabel;
    console.log(`  match ${match._id}: "${match.name}" [${match.gameLabel}] -> "${nextName}" [${nextLabel}]`);
    if (!apply) continue;
    await matchesCol.updateOne(
      { _id: match._id },
      { $set: { name: nextName, nameLower: nextName.toLowerCase(), gameLabel: nextLabel } }
    );
  }
  return matches.length;
}

async function renameNotificationText(apply: boolean): Promise<number> {
  const notificationsCol = await getNotifications();
  const fields = ['payload.gameName', 'payload.matchName'];
  const notifications = await notificationsCol
    .find({ $or: fields.map((field) => ({ [field]: { $regex: OLD_LABEL_PATTERN } })) })
    .toArray();

  for (const notification of notifications) {
    const updates: Record<string, string> = {};
    for (const key of ['gameName', 'matchName']) {
      const value = notification.payload[key];
      if (typeof value === 'string' && OLD_LABEL_PATTERN.test(value)) updates[`payload.${key}`] = renamed(value);
    }
    if (apply && Object.keys(updates).length > 0) {
      await notificationsCol.updateOne({ _id: notification._id }, { $set: updates });
    }
  }
  return notifications.length;
}

async function announce(): Promise<number> {
  const usersCol = await getUsers();
  const users = await usersCol.find({}, { projection: { _id: 1 } }).toArray();
  await notifyMany(
    users.map((user) => ({ userId: user._id!.toString(), type: 'announcement' as const, payload: ANNOUNCEMENT }))
  );
  return users.length;
}

async function main(): Promise<void> {
  const apply = process.argv.includes(APPLY_FLAG);
  const shouldAnnounce = process.argv.includes(ANNOUNCE_FLAG);
  console.log(apply ? `Renaming "${OLD_LABEL}" to "${NEW_LABEL}"` : `Dry run (pass ${APPLY_FLAG} to write)`);

  const matchCount = await renameMatches(apply);
  const notificationCount = await renameNotificationText(apply);
  console.log(`Matches: ${matchCount}, notifications mentioning the old name: ${notificationCount}`);
  if (!apply) return;

  const { newMilestones } = await rebuildAllPlayerStats();
  await notifyMilestones(newMilestones);
  console.log(`Rebuilt player stats; new milestones: ${newMilestones.size}`);

  if (shouldAnnounce) {
    const recipients = await announce();
    console.log(`Announcement sent to ${recipients} users`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeMongoConnection());
