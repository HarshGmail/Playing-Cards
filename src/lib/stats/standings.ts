import { ObjectId } from 'mongodb';
import { getMatches, getScores, Match, MatchStanding } from '@/lib/db/collections';
import { computeMatchLeaderboard } from '@/lib/domain/ranking';
import { roundScoresWithinCutoff, toStandings, withGameRuns } from '@/lib/domain/playerStats';

export type StandingsMatch = Pick<Match, 'name' | 'status' | 'roundsPlayed'> & {
  standings: MatchStanding[];
};

const STANDINGS_INPUT_PROJECTION = {
  name: 1,
  status: 1,
  roundsPlayed: 1,
  roster: 1,
  rankPreference: 1,
  tiebreakers: 1,
} as const;

const SCORE_PROJECTION = { _id: 0, playerId: 1, round: 1, value: 1 } as const;

export async function recomputeMatchStandings(matchId: string): Promise<StandingsMatch | null> {
  if (!ObjectId.isValid(matchId)) return null;
  const _id = new ObjectId(matchId);

  const matchesCol = await getMatches();
  const match = await matchesCol.findOne(
    { _id, deletedAt: null },
    { projection: STANDINGS_INPUT_PROJECTION }
  );
  if (!match) return null;

  const scoresCol = await getScores();
  const scores = await scoresCol
    .find({ matchId }, { projection: SCORE_PROJECTION })
    .toArray();

  const standings = withGameRuns(
    toStandings(
      computeMatchLeaderboard(match.roster, scores, match.rankPreference, match.tiebreakers)
    ),
    roundScoresWithinCutoff(match.roster, scores),
    match.rankPreference
  );

  await matchesCol.updateOne({ _id }, { $set: { standings } });

  return {
    name: match.name,
    status: match.status,
    roundsPlayed: match.roundsPlayed,
    standings,
  };
}
