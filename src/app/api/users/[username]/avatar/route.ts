import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { getUsers } from '@/lib/db/collections';
import { success, notFound, forbidden, error } from '@/lib/api/respond';
import { logger, logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { isModerator } from '@/lib/domain/moderation';
import { removeProfilePic } from '@/lib/users/removeProfilePic';
import { notifyUser } from '@/lib/notifications/create';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const requestId = crypto.randomUUID?.() || Date.now().toString();
  const startTime = Date.now();
  const respond = (response: Response) => {
    logApiResponse(requestId, response.status, Date.now() - startTime);
    return response;
  };

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return respond(authResult);

    const { userId } = authResult;
    logApiRequest(requestId, `DELETE /api/users/${params.username}/avatar`, userId, {
      username: params.username,
    });

    const usersCol = await getUsers();
    const requester = await usersCol.findOne({ _id: new ObjectId(userId) });
    if (!isModerator(requester?.username)) return respond(forbidden());

    const target = await usersCol.findOne({ username: params.username });
    if (!target?._id) return respond(notFound());

    const targetId = target._id.toString();
    const hadPhoto = Boolean(target.profilePicUrl);
    if (hadPhoto) {
      await removeProfilePic(targetId);
      logger.info('Moderator removed a profile photo', {
        moderatorId: userId,
        targetUserId: targetId,
        targetUsername: target.username,
      });

      if (targetId !== userId) {
        await notifyUser(targetId, 'avatar-removed', {}).catch((err) => {
          logger.warn('Avatar removal notification failed', {
            message: err instanceof Error ? err.message : String(err),
          });
        });
      }
    }

    return respond(
      success({
        user: {
          id: targetId,
          name: target.name,
          username: target.username,
          profilePicUrl: null,
        },
        removed: hadPhoto,
      })
    );
  } catch (err) {
    logError(requestId, err);
    return respond(error('Internal server error', 'INTERNAL_ERROR', 500));
  }
}
