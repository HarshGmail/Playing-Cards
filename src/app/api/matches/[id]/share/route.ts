import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { getMatches, getShareLinks } from '@/lib/db/collections';
import { success, notFound, unauthorized, error, forbidden } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';
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

    logApiRequest(requestId, `POST /api/matches/${params.id}/share`, payload.userId, {
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
    if (match.creatorId !== payload.userId) {
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

    // Create share link (valid for 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const result = await shareLinksCol.insertOne({
      matchId: params.id,
      code,
      createdBy: payload.userId,
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
