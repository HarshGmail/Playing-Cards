import { getFriendships } from '@/lib/db/collections';

export async function viewerAndFriendIds(viewerId: string): Promise<string[]> {
  const friendshipsCol = await getFriendships();
  const friendships = await friendshipsCol
    .find({ $or: [{ userA: viewerId }, { userB: viewerId }] }, { projection: { userA: 1, userB: 1 } })
    .toArray();
  return Array.from(
    new Set([viewerId, ...friendships.map((f) => (f.userA === viewerId ? f.userB : f.userA))])
  );
}
