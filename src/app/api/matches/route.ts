import { NextRequest } from 'next/server';
import { getMatches, getUsers, Match } from '@/lib/db/collections';
import { createMatchSchema } from '@/lib/schemas/match';
import { success, validationError, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { createMatch, MatchServiceError } from '@/lib/matches/service';
import { ObjectId } from 'mongodb';
import { leaderOf } from '@/lib/domain/playerStats';
import { toGameType } from '@/lib/games/catalog';
import type { MatchSummary } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID?.() || Date.now().toString();
  const startTime = Date.now();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }

    const { userId } = authResult;

    const body = await request.json();
    logApiRequest(requestId, 'POST /api/matches', userId, {
      name: body.name,
    });

    const parsed = createMatchSchema.safeParse(body);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      const issue = parsed.error.issues[0];
      const field = issue?.path.join('.');
      return validationError(
        issue ? `${field ? `${field}: ` : ''}${issue.message}` : 'Invalid input'
      );
    }

    const created = await createMatch(userId, parsed.data);

    logApiResponse(requestId, 201, Date.now() - startTime);

    return success(created, 201);
  } catch (err) {
    if (err instanceof MatchServiceError) {
      logApiResponse(requestId, err.status, Date.now() - startTime);
      return error(err.message, err.code, err.status);
    }
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

const MATCH_SUMMARY_PROJECTION = {
  name: 1,
  creatorId: 1,
  status: 1,
  roundsPlayed: 1,
  roster: 1,
  version: 1,
  createdAt: 1,
  endedAt: 1,
  gameType: 1,
  gameLabel: 1,
  standings: 1,
} as const;

function parseDateParam(value: string | null): Date | null | undefined {
  if (value === null) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function createdAtRange(from: Date | undefined, to: Date | undefined) {
  if (!from && !to) return {};
  return {
    createdAt: {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lt: to } : {}),
    },
  };
}

async function loadRosterIdentities(matches: Match[]) {
  const rosterIds = Array.from(
    new Set(matches.flatMap((m) => m.roster.map((r) => r.userId)))
  ).filter((id) => ObjectId.isValid(id));
  if (rosterIds.length === 0) return new Map<string, { username: string; profilePicUrl: string | null }>();

  const usersCol = await getUsers();
  const users = await usersCol
    .find(
      { _id: { $in: rosterIds.map((id) => new ObjectId(id)) } },
      { projection: { username: 1, profilePicUrl: 1 } }
    )
    .toArray();
  return new Map(
    users.map((u) => [u._id!.toString(), { username: u.username, profilePicUrl: u.profilePicUrl ?? null }])
  );
}

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

    const fromParam = request.nextUrl.searchParams.get('from');
    const toParam = request.nextUrl.searchParams.get('to');
    logApiRequest(requestId, 'GET /api/matches', userId, { from: fromParam, to: toParam });

    const from = parseDateParam(fromParam);
    const to = parseDateParam(toParam);
    if (from === null || to === null) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError('from and to must be ISO dates');
    }

    const matchesCol = await getMatches();
    const matches = await matchesCol
      .find(
        {
          $or: [
            { creatorId: userId },
            { 'roster.userId': userId },
          ],
          deletedAt: null,
          ...createdAtRange(from, to),
        },
        { projection: MATCH_SUMMARY_PROJECTION }
      )
      .sort({ createdAt: -1 })
      .toArray();

    const identities = await loadRosterIdentities(matches);

    const summaries: MatchSummary[] = matches.map((m) => ({
      id: m._id!.toString(),
      name: m.name,
      creatorId: m.creatorId,
      status: m.status,
      roundsPlayed: m.roundsPlayed,
      roster: m.roster.map((r) => ({ ...r, ...identities.get(r.userId) })),
      version: m.version,
      createdAt: m.createdAt.toISOString(),
      endedAt: m.endedAt ? m.endedAt.toISOString() : null,
      gameType: toGameType(m.gameType),
      gameLabel: m.gameLabel ?? null,
      leader: leaderOf(m.standings, m.roster),
    }));

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({ matches: summaries });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
