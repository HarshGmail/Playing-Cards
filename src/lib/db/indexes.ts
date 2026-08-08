import {
  getUsers,
  getMatches,
  getScores,
  getFriendships,
  getFriendRequests,
  getJoinRequests,
  getMatchInvites,
  getShareLinks,
  getNotifications,
} from './collections';

export async function ensureIndexes(): Promise<void> {
  const users = await getUsers();
  await users.createIndex({ username: 1 }, { unique: true });
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ phone: 1 }, { unique: true });

  const matches = await getMatches();
  await matches.createIndex({ creatorId: 1, status: 1 });
  await matches.createIndex({ 'roster.userId': 1, status: 1 });
  await matches.createIndex({ nameLower: 1 });
  await matches.createIndex({ deletedAt: 1 });

  const scores = await getScores();
  await scores.createIndex(
    { matchId: 1, round: 1, playerId: 1 },
    { unique: true }
  );
  await scores.createIndex({ matchId: 1, round: 1 });

  const friendships = await getFriendships();
  await friendships.createIndex({ userA: 1, userB: 1 }, { unique: true });

  const friendRequests = await getFriendRequests();
  await friendRequests.createIndex({ toUserId: 1, status: 1 });
  await friendRequests.createIndex(
    { fromUserId: 1, toUserId: 1 },
    { unique: true, sparse: true }
  );

  const joinRequests = await getJoinRequests();
  await joinRequests.createIndex({ matchId: 1, status: 1 });
  await joinRequests.createIndex({ userId: 1, status: 1 });

  const matchInvites = await getMatchInvites();
  await matchInvites.createIndex({ userId: 1, status: 1 });
  await matchInvites.createIndex({ matchId: 1, status: 1 });
  // One invite per person per match — re-inviting reuses the existing document
  // rather than stacking duplicates in the invitee's notification list.
  await matchInvites.createIndex({ matchId: 1, userId: 1 }, { unique: true });

  const shareLinks = await getShareLinks();
  await shareLinks.createIndex({ code: 1 }, { unique: true });
  await shareLinks.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
  );

  const notifications = await getNotifications();
  await notifications.createIndex({ userId: 1, read: 1, createdAt: -1 });
  // Per-round notifications carry an expiresAt a day out and are swept by this
  // index. Everything else stores null there, which the TTL monitor ignores.
  await notifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
