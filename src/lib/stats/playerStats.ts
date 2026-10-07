import type { AnyBulkWriteOperation } from 'mongodb';
import { getMatches, getPlayerStats, PlayerStats } from '@/lib/db/collections';
import {
  buildPlayerStats,
  MatchStandingsRecord,
  ZERO_PLAYER_STATS,
} from '@/lib/domain/playerStats';
import type { RatingState } from '@/lib/domain/rating';

const STANDINGS_RECORD_PROJECTION = {
  status: 1,
  roundsPlayed: 1,
  endedAt: 1,
  standings: 1,
} as const;

export type RatingChanges = Map<string, RatingState>;

async function loadStandingsRecords(): Promise<MatchStandingsRecord[]> {
  const matchesCol = await getMatches();
  const matches = await matchesCol
    .find(
      { deletedAt: null, roundsPlayed: { $gte: 1 }, standings: { $exists: true } },
      { projection: STANDINGS_RECORD_PROJECTION }
    )
    .toArray();

  return matches.map((match) => ({
    matchId: match._id!.toString(),
    status: match.status,
    roundsPlayed: match.roundsPlayed,
    endedAt: match.endedAt,
    standings: match.standings ?? [],
  }));
}

export async function rebuildAllPlayerStats(): Promise<RatingChanges> {
  const records = await loadStandingsRecords();
  const { stats, ratings } = buildPlayerStats(records);
  const updatedAt = new Date();
  const playerStatsCol = await getPlayerStats();

  const upserts: AnyBulkWriteOperation<PlayerStats>[] = Array.from(stats.values()).map(
    (aggregate) => ({
      updateOne: {
        filter: { userId: aggregate.userId },
        update: { $set: { ...aggregate, updatedAt } },
        upsert: true,
      },
    })
  );
  if (upserts.length > 0) await playerStatsCol.bulkWrite(upserts, { ordered: false });

  await playerStatsCol.updateMany(
    { userId: { $nin: Array.from(stats.keys()) } },
    { $set: { ...ZERO_PLAYER_STATS, updatedAt } }
  );

  return ratings;
}
