import { ObjectId } from 'mongodb';
import { closeMongoConnection } from '../src/lib/db/client';
import { getMatches, getPlayerStats, getUsers } from '../src/lib/db/collections';
import { ensureIndexes } from '../src/lib/db/indexes';
import { recomputeMatchStandings } from '../src/lib/stats/standings';
import { rebuildAllPlayerStats } from '../src/lib/stats/playerStats';

const PERCENT = 100;

function formatPercent(fraction: number): string {
  return `${(fraction * PERCENT).toFixed(1)}%`;
}

async function recomputeAllStandings(): Promise<number> {
  const matchesCol = await getMatches();
  const matches = await matchesCol
    .find({ deletedAt: null }, { projection: { _id: 1 } })
    .toArray();
  for (const match of matches) {
    await recomputeMatchStandings(match._id!.toString());
  }
  return matches.length;
}

async function printSummary(): Promise<void> {
  const playerStatsCol = await getPlayerStats();
  const stats = await playerStatsCol
    .find({ gamesPlayed: { $gt: 0 } })
    .sort({ rating: -1, matchWins: -1 })
    .toArray();

  const usersCol = await getUsers();
  const users = await usersCol
    .find(
      { _id: { $in: stats.map((s) => new ObjectId(s.userId)) } },
      { projection: { username: 1 } }
    )
    .toArray();
  const usernameById = new Map(users.map((u) => [u._id!.toString(), u.username]));

  console.table(
    stats.map((s) => ({
      username: usernameById.get(s.userId) ?? s.userId,
      rating: s.rating,
      matchWins: s.matchWins,
      winPct: formatPercent(s.winPct),
    }))
  );
}

async function main(): Promise<void> {
  await ensureIndexes();
  const matchCount = await recomputeAllStandings();
  const ratings = await rebuildAllPlayerStats();
  console.log(`Recomputed standings for ${matchCount} matches; rated ${ratings.size} players.`);
  await printSummary();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeMongoConnection());
