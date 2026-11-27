import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api/auth';
import { success, validationError, error, notFound } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { getUsers } from '@/lib/db/collections';
import { ALL_GAMES_KEY, RATING_GAME_KEY_PATTERN } from '@/lib/games/catalog';
import { fastestRecords, reachedBy } from '@/lib/domain/fastestRecords';
import { loadIdentities, UNKNOWN_IDENTITY, type PlayerIdentity } from '@/lib/stats/identities';
import { viewerAndFriendIds } from '@/lib/stats/friends';
import { loadRecordBook, toRecordHolder, type RecordTrack } from '@/lib/stats/fastestRecords';
import { loadRatedGames } from '@/lib/stats/ratingGames';
import type { FastestRecordView, RecordKind, RecordProgressView, RecordSubject } from '@/types';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  game: z
    .string()
    .refine((key) => key === ALL_GAMES_KEY || RATING_GAME_KEY_PATTERN.test(key))
    .default(ALL_GAMES_KEY),
  scope: z.enum(['friends', 'global']).default('friends'),
  subject: z.string().trim().min(1).optional(),
});

async function resolveSubject(viewerId: string, username: string | undefined): Promise<RecordSubject | null> {
  const usersCol = await getUsers();
  const user = username
    ? await usersCol.findOne({ username }, { projection: { name: 1 } })
    : null;
  if (username && !user) return null;
  const userId = user?._id?.toString() ?? viewerId;
  return { userId, name: user?.name ?? 'You', isViewer: userId === viewerId };
}

function recordsFor(kind: RecordKind, track: RecordTrack, memberIds: Set<string> | null) {
  return fastestRecords(kind, memberIds ? reachedBy(track.reached, memberIds) : track.reached);
}

function toViews(
  kind: RecordKind,
  track: RecordTrack,
  records: ReturnType<typeof fastestRecords>,
  identities: Map<string, PlayerIdentity>,
  subjectId: string
): FastestRecordView[] {
  const subjectReached = track.reached.get(subjectId);
  return records.map((record) => {
    const achievement = subjectReached?.get(record.threshold);
    return {
      kind,
      threshold: record.threshold,
      holder: toRecordHolder(record.holder, identities.get(record.holder.playerId) ?? UNKNOWN_IDENTITY),
      subjectReached: achievement ? { count: achievement.count, at: achievement.at } : null,
    };
  });
}

function progressFor(track: RecordTrack, subjectId: string): RecordProgressView | null {
  const progress = track.progress.get(subjectId);
  return progress ? { wins: progress.wins, played: progress.played } : null;
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

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    logApiRequest(requestId, 'GET /api/records', userId, searchParams);

    const parsed = querySchema.safeParse(searchParams);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(`game must be a lowercase slug or ${ALL_GAMES_KEY}; scope friends|global`);
    }
    const { game, scope } = parsed.data;

    const subject = await resolveSubject(userId, parsed.data.subject);
    if (!subject) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const [book, games, memberIds] = await Promise.all([
      loadRecordBook(game),
      loadRatedGames(),
      scope === 'friends' ? viewerAndFriendIds(userId).then((ids) => new Set(ids)) : Promise.resolve(null),
    ]);
    const matchWinRecords = recordsFor('matchWins', book.matchWins, memberIds);
    const gameWinRecords = recordsFor('gameWins', book.gameWins, memberIds);
    const identities = await loadIdentities(
      [...matchWinRecords, ...gameWinRecords].map((record) => record.holder.playerId)
    );

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({
      matchWins: toViews('matchWins', book.matchWins, matchWinRecords, identities, subject.userId),
      gameWins: toViews('gameWins', book.gameWins, gameWinRecords, identities, subject.userId),
      subject,
      subjectProgress: {
        matchWins: progressFor(book.matchWins, subject.userId),
        gameWins: progressFor(book.gameWins, subject.userId),
      },
      games,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
