import { ObjectId } from 'mongodb';
import { getUsers } from '@/lib/db/collections';
import { notifyUser } from './create';

async function findIdentity(userId: string) {
  if (!ObjectId.isValid(userId)) return null;
  const usersCol = await getUsers();
  return usersCol.findOne(
    { _id: new ObjectId(userId) },
    { projection: { name: 1, username: 1, profilePicUrl: 1 } }
  );
}

export async function notifyFriendRequestSent(
  fromUserId: string,
  toUserId: string,
  requestId: string | undefined
): Promise<void> {
  const sender = await findIdentity(fromUserId);
  await notifyUser(toUserId, 'friend-request', {
    requestId,
    fromUserId,
    fromUserName: sender?.name ?? null,
    fromUsername: sender?.username ?? null,
    fromProfilePicUrl: sender?.profilePicUrl ?? null,
  });
}

export async function notifyFriendRequestAccepted(
  fromUserId: string,
  acceptedByUserId: string
): Promise<void> {
  const accepter = await findIdentity(acceptedByUserId);
  await notifyUser(fromUserId, 'friend-accepted', {
    toUserId: acceptedByUserId,
    toUserName: accepter?.name ?? null,
    toUsername: accepter?.username ?? null,
    toProfilePicUrl: accepter?.profilePicUrl ?? null,
  });
}
