import { ObjectId } from 'mongodb';
import { getUsers } from '@/lib/db/collections';
import { isAppAdmin } from './admin';

export async function isAppAdminUserId(userId: string): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  const users = await getUsers();
  const user = await users.findOne({ _id: new ObjectId(userId) }, { projection: { email: 1 } });
  return isAppAdmin(user);
}
