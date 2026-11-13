import { ObjectId } from 'mongodb';
import { getUsers, type User } from '@/lib/db/collections';
import { deleteAvatar } from '@/lib/storage/cloudinary';

export async function removeProfilePic(userId: string): Promise<User | null> {
  const usersCol = await getUsers();
  const updated = await usersCol.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: { profilePicUrl: null, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!updated) return null;

  await deleteAvatar(userId);
  return updated as User;
}
