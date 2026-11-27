import { ObjectId } from 'mongodb';
import { getUsers } from '@/lib/db/collections';

export interface PlayerIdentity {
  name: string;
  username: string;
  profilePicUrl: string | null;
}

export const UNKNOWN_IDENTITY: PlayerIdentity = { name: 'Unknown', username: '', profilePicUrl: null };

export async function loadIdentities(userIds: string[]): Promise<Map<string, PlayerIdentity>> {
  const objectIds = Array.from(new Set(userIds))
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  if (objectIds.length === 0) return new Map();
  const usersCol = await getUsers();
  const users = await usersCol
    .find({ _id: { $in: objectIds } }, { projection: { name: 1, username: 1, profilePicUrl: 1 } })
    .toArray();
  return new Map(
    users.map((u) => [
      u._id!.toString(),
      { name: u.name, username: u.username, profilePicUrl: u.profilePicUrl ?? null },
    ])
  );
}
