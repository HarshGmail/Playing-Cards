import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getMatches, getShareLinks } from '@/lib/db/collections';
import { success, notFound, unauthorized, error, forbidden } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { ObjectId } from 'mongodb';

/**
 * POST /api/matches/[id]/share
 * Generate a share code for the match.
 * Only creator can generate share codes.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID?.() || Date.now().toString();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }
    const { userId } = authResult;

    logApiRequest(requestId, `POST /api/matches/${params.id}/share`, userId, {
      matchId: params.id,
    });

    // Validate ObjectId format
    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const matchesCol = await getMatches();
    const match = await matchesCol.findOne({
      _id: new ObjectId(params.id),
      deletedAt: null,
    });

    if (!match) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    // Only creator can share
    if (match.creatorId !== userId) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    // Generate a unique share code (6-character alphanumeric)
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const shareLinksCol = await getShareLinks();
    let code = generateCode();

    // Ensure code is unique
    while (await shareLinksCol.findOne({ code })) {
      code = generateCode();
    }

    // Share links are short-lived (15 min), unlimited uses within that
    // window, and revocable by the creator via DELETE.
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const result = await shareLinksCol.insertOne({
      matchId: params.id,
      code,
      createdBy: userId,
      createdAt: new Date(),
      expiresAt,
      revokedAt: null,
    });

    logApiResponse(requestId, 201, Date.now() - startTime);

    return success(
      {
        shareCode: code,
        shareLinkId: result.insertedId.toString(),
        matchId: params.id,
        expiresAt,
      },
      201
    );
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

/**
 * DELETE /api/matches/[id]/share
 * Revoke all active share codes for the match. Only creator can revoke.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID?.() || Date.now().toString();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }
    const { userId } = authResult;

    logApiRequest(requestId, `DELETE /api/matches/${params.id}/share`, userId, {
      matchId: params.id,
    });

    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const matchesCol = await getMatches();
    const match = await matchesCol.findOne({
      _id: new ObjectId(params.id),
      deletedAt: null,
    });

    if (!match) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    if (match.creatorId !== userId) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    const shareLinksCol = await getShareLinks();
    await shareLinksCol.updateMany(
      { matchId: params.id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ matchId: params.id, revoked: true });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
