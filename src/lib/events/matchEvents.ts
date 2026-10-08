import { notifyMany, NotificationInput } from '@/lib/notifications/create';
import { rankAmongPlayed } from '@/lib/domain/playerStats';
import { recomputeMatchStandings, StandingsMatch } from '@/lib/stats/standings';
import { rebuildAllPlayerStats, RatingChanges } from '@/lib/stats/playerStats';

export async function onRoundsChanged(matchId: string): Promise<void> {
  const match = await recomputeMatchStandings(matchId);
  if (match?.status === 'ended') await rebuildAllPlayerStats();
}

function matchWonNotifications(
  matchId: string,
  match: StandingsMatch,
  ratingChanges: RatingChanges
): NotificationInput[] {
  const winners = rankAmongPlayed(match.standings).filter((s) => !s.isDnf && s.rank === 1);
  return winners.map((winner) => {
    const rating = ratingChanges.get(winner.playerId);
    const ratedThisMatch = rating?.lastMatchId === matchId;
    return {
      userId: winner.playerId,
      type: 'match-won',
      payload: {
        matchId,
        matchName: match.name,
        roundsPlayed: match.roundsPlayed,
        ratingDelta: ratedThisMatch ? rating.lastDelta : null,
        newRating: ratedThisMatch ? rating.rating : null,
      },
    };
  });
}

export async function onMatchEnded(matchId: string): Promise<void> {
  const match = await recomputeMatchStandings(matchId);
  if (!match) return;
  const ratingChanges = await rebuildAllPlayerStats();
  await notifyMany(matchWonNotifications(matchId, match, ratingChanges));
}

export async function onMatchResumed(): Promise<void> {
  await rebuildAllPlayerStats();
}
