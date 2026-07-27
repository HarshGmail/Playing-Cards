import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { getUsers, User } from '@/lib/db/collections';
import { success, unauthorized, error, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  dob: z.string().optional(),
  profilePicUrl: z.string().url().optional().nullable(),
});

/**
 * GET /api/users/me
 * Get the current user's full profile.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const token = request.cookies.get('auth')?.value;
    if (!token) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return unauthorized();
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return unauthorized();
    }

    logApiRequest(requestId, 'GET /api/users/me', payload.userId, {});

    const usersCol = await getUsers();
    const user = await usersCol.findOne({
      _id: new ObjectId(payload.userId),
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

/**
 * PATCH /api/users/me
 * Update the current user's profile.
 */
export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const token = request.cookies.get('auth')?.value;
    if (!token) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return unauthorized();
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return unauthorized();
    }

    const body = await request.json();

    logApiRequest(requestId, 'PATCH /api/users/me', payload.userId, {
      fieldsUpdated: Object.keys(body),
    });

    // Validate request body
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    // Only update fields that were provided
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (parsed.data.name !== undefined) {
      updateFields.name = parsed.data.name;
    }
    if (parsed.data.phone !== undefined) {
      updateFields.phone = parsed.data.phone;
    }
    if (parsed.data.dob !== undefined) {
      updateFields.dob = parsed.data.dob;
    }
    if (parsed.data.profilePicUrl !== undefined) {
      updateFields.profilePicUrl = parsed.data.profilePicUrl;
    }

    const usersCol = await getUsers();
    const result = await usersCol.findOneAndUpdate(
      { _id: new ObjectId(payload.userId) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    const user = result as User;

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
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
