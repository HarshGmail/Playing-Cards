import { ObjectId } from 'mongodb';
import { getMatches, getScores, Match } from '@/lib/db/collections';
import { buildMatchRecap, MatchRecap } from '@/lib/domain/matchRecap';
import { ratedMatchesForGame, roundScoresWithinCutoff } from '@/lib/domain/playerStats';
import { matchRatingDeltas } from '@/lib/domain/rating';
import { gameDisplayName, ratingGameFor } from '@/lib/games/catalog';
import { loadStandingsRecords } from './playerStats';
import { canWatchMatch } from '@/lib/api/viewableMatch';

const SCORE_PROJECTION = { _id: 0, playerId: 1, round: 1, value: 1 } as const;

export interface MatchRecapView {
  matchName: string;
  gameName: string;
  roundsPlayed: number;
  endedAt: Date;
  rankPreference: Match['rankPreference'];
  recap: MatchRecap;
}

export type MatchRecapResult =
  | { access: 'ok'; view: MatchRecapView }
  | { access: 'not-found' }
  | { access: 'forbidden' }
  | { access: 'not-ended' };


async function loadRatingDeltas(matchId: string, gameKey: string): Promise<Map<string, number>> {
  const ratedMatches = ratedMatchesForGame(await loadStandingsRecords(), gameKey);
  return matchRatingDeltas(ratedMatches, matchId);
}

export async function loadMatchRecap(matchId: string, userId: string): Promise<MatchRecapResult> {
  if (!ObjectId.isValid(matchId)) return { access: 'not-found' };

  const matchesCol = await getMatches();
  const match = await matchesCol.findOne({ _id: new ObjectId(matchId), deletedAt: null });
  if (!match) return { access: 'not-found' };
  if (!(await canWatchMatch(match, userId))) return { access: 'forbidden' };
  if (match.status !== 'ended' || !match.endedAt || !match.standings) {
    return { access: 'not-ended' };
  }

  const scoresCol = await getScores();
  const [scores, ratingDeltas] = await Promise.all([
    scoresCol.find({ matchId }, { projection: SCORE_PROJECTION }).toArray(),
    loadRatingDeltas(matchId, ratingGameFor(match.gameType, match.gameLabel).key),
  ]);

  return {
    access: 'ok',
    view: {
      matchName: match.name,
      gameName: gameDisplayName(match.gameType, match.gameLabel),
      roundsPlayed: match.roundsPlayed,
      endedAt: match.endedAt,
      rankPreference: match.rankPreference,
      recap: buildMatchRecap({
        standings: match.standings,
        rounds: roundScoresWithinCutoff(match.roster, scores),
        names: new Map(match.roster.map((r) => [r.userId, r.userName])),
        ratingDeltas,
      }),
    },
  };
}
