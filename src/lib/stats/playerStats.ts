import type { AnyBulkWriteOperation } from 'mongodb';
import {
  AchievedMilestoneDoc,
  getMatches,
  getPlayerStats,
  getScores,
  PlayerStats,
} from '@/lib/db/collections';
import {
  ActiveDaysByPlayer,
  buildPlayerStats,
  MatchStandingsRecord,
  resolveMilestones,
  toMilestoneStats,
  ZERO_PLAYER_STATS,
} from '@/lib/domain/playerStats';
import type { RatingState } from '@/lib/domain/rating';
import type { Milestone } from '@/lib/domain/milestones';
import { APP_TIME_ZONE } from '@/lib/domain/streaks';

const STANDINGS_RECORD_PROJECTION = {
  status: 1,
  roundsPlayed: 1,
  createdAt: 1,
  endedAt: 1,
  standings: 1,
} as const;

const DAY_KEY_FORMAT = '%Y-%m-%d';

export type RatingChanges = Map<string, RatingState>;
export type NewMilestones = Map<string, Milestone[]>;

export interface PlayerStatsRebuild {
  ratingChanges: RatingChanges;
  newMilestones: NewMilestones;
}

type ExistingMilestones = Map<string, AchievedMilestoneDoc[] | null>;

export async function loadStandingsRecords(): Promise<MatchStandingsRecord[]> {
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
    createdAt: match.createdAt,
    endedAt: match.endedAt,
    standings: match.standings ?? [],
  }));
}

async function loadActiveDays(matchIds: string[]): Promise<ActiveDaysByPlayer> {
  if (matchIds.length === 0) return new Map();
  const scoresCol = await getScores();
  const rows = await scoresCol
    .aggregate<{ _id: string; days: string[] }>([
      { $match: { matchId: { $in: matchIds } } },
      {
        $group: {
          _id: {
            playerId: '$playerId',
            day: {
              $dateToString: { format: DAY_KEY_FORMAT, date: '$enteredAt', timezone: APP_TIME_ZONE },
            },
          },
        },
      },
      { $group: { _id: '$_id.playerId', days: { $push: '$_id.day' } } },
    ])
    .toArray();
  return new Map(rows.map((row) => [row._id, row.days]));
}

async function loadExistingMilestones(): Promise<ExistingMilestones> {
  const playerStatsCol = await getPlayerStats();
  const docs = await playerStatsCol
    .find({}, { projection: { _id: 0, userId: 1, milestones: 1 } })
    .toArray();
  return new Map(docs.map((doc) => [doc.userId, doc.milestones ?? null]));
}

function isFirstMilestoneRun(existing: ExistingMilestones): boolean {
  return Array.from(existing.values()).every((milestones) => milestones === null);
}

export async function rebuildAllPlayerStats(): Promise<PlayerStatsRebuild> {
  const records = await loadStandingsRecords();
  const [activeDays, existingMilestones] = await Promise.all([
    loadActiveDays(records.map((record) => record.matchId)),
    loadExistingMilestones(),
  ]);
  const { stats, ratings } = buildPlayerStats(records, activeDays);
  const updatedAt = new Date();
  const firstMilestoneRun = isFirstMilestoneRun(existingMilestones);
  const newMilestones: NewMilestones = new Map();
  const playerStatsCol = await getPlayerStats();

  const upserts: AnyBulkWriteOperation<PlayerStats>[] = Array.from(stats.values()).map(
    (aggregate) => {
      const existing = existingMilestones.has(aggregate.userId)
        ? existingMilestones.get(aggregate.userId)!
        : firstMilestoneRun
          ? null
          : [];
      const { milestones, toNotify } = resolveMilestones(
        existing,
        toMilestoneStats(aggregate),
        updatedAt
      );
      if (toNotify.length > 0) newMilestones.set(aggregate.userId, toNotify);
      return {
        updateOne: {
          filter: { userId: aggregate.userId },
          update: { $set: { ...aggregate, milestones, updatedAt } },
          upsert: true,
        },
      };
    }
  );
  if (upserts.length > 0) await playerStatsCol.bulkWrite(upserts, { ordered: false });

  await playerStatsCol.updateMany(
    { userId: { $nin: Array.from(stats.keys()) } },
    { $set: { ...ZERO_PLAYER_STATS, updatedAt } }
  );

  return { ratingChanges: ratings, newMilestones };
}
