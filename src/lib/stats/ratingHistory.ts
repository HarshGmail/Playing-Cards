import { ObjectId } from 'mongodb';
import { getMatches } from '@/lib/db/collections';
import { toRatedMatch } from '@/lib/domain/playerStats';
import { RatedMatch, ratingHistoryFor } from '@/lib/domain/rating';
import type { RatingHistoryEntry } from '@/types';
import { loadStandingsRecords } from './playerStats';

const UNNAMED_MATCH = 'Match';

async function loadMatchNames(matchIds: string[]): Promise<Map<string, string>> {
  if (matchIds.length === 0) return new Map();
  const matchesCol = await getMatches();
  const matches = await matchesCol
    .find(
      { _id: { $in: matchIds.map((id) => new ObjectId(id)) } },
      { projection: { name: 1 } }
    )
    .toArray();
  return new Map(matches.map((match) => [match._id!.toString(), match.name]));
}

export async function loadRatingHistory(userId: string): Promise<RatingHistoryEntry[]> {
  const ratedMatches = (await loadStandingsRecords())
    .map(toRatedMatch)
    .filter((match): match is RatedMatch => match !== null);
  const history = ratingHistoryFor(ratedMatches, userId);
  const names = await loadMatchNames(history.map((point) => point.matchId));

  return history.map((point) => ({
    matchId: point.matchId,
    matchName: names.get(point.matchId) ?? UNNAMED_MATCH,
    endedAt: point.endedAt.toISOString(),
    rating: point.rating,
    delta: point.delta,
  }));
}
