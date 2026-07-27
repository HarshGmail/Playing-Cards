import { NextRequest } from 'next/server';
import { getUsers, User } from '@/lib/db/collections';
import { success, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { createHandler } from '@/lib/api/handler';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  dob: z.string().optional(),
  profilePicUrl: z.string().url().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID?.() || Date.now().toString();
  const startTime = Date.now();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }

    const { userId } = authResult;
    logApiRequest(requestId, 'GET /api/users/me', userId, {});

    const usersCol = await getUsers();
    const user = await usersCol.findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      user: {
        id: user._id?.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
        profilePicUrl: user.profilePicUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export const PATCH = createHandler(
  async (_, data, userId) => {
    if (!userId) {
      return error('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const payload = data as typeof updateProfileSchema._type;

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) {
      updateFields.name = payload.name;
    }
    if (payload.phone !== undefined) {
      updateFields.phone = payload.phone;
    }
    if (payload.dob !== undefined) {
      updateFields.dob = payload.dob;
    }
    if (payload.profilePicUrl !== undefined) {
      updateFields.profilePicUrl = payload.profilePicUrl;
    }

    const usersCol = await getUsers();
    const result = await usersCol.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    const user = result as User;

    return success({
      user: {
        id: user._id?.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
        profilePicUrl: user.profilePicUrl,
        updatedAt: user.updatedAt,
      },
    });
  },
  {
    rateLimitKey: 'update-profile',
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000,
    schema: updateProfileSchema,
    requireAuth: true,
  }
);
