import { NextRequest } from 'next/server';
import { getUsers } from '@/lib/db/collections';
import { success, unauthorized } from '@/lib/api/respond';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return unauthorized();
  }

  try {
    const users = await getUsers();
    const user = await users.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return unauthorized();
    }

    return success({
      user: {
        id: user._id!.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
      },
    });
  } catch {
    return unauthorized();
  }
}
