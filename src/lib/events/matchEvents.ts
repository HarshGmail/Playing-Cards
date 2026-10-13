import { notifyMany, NotificationInput } from '@/lib/notifications/create';
import { rankAmongPlayed, RatingsByGame } from '@/lib/domain/playerStats';
import { ratingGameFor } from '@/lib/games/catalog';
import { recomputeMatchStandings, StandingsMatch } from '@/lib/stats/standings';
import { NewMilestones, rebuildAllPlayerStats } from '@/lib/stats/playerStats';

function milestoneNotifications(newMilestones: NewMilestones): NotificationInput[] {
  return Array.from(newMilestones).flatMap(([userId, milestones]) =>
    milestones.map((milestone) => ({
      userId,
      type: 'milestone' as const,
      payload: {
        milestoneId: milestone.id,
        title: milestone.title,
        emoji: milestone.emoji,
        metric: milestone.metric,
        threshold: milestone.threshold,
      },
    }))
  );
}

export async function notifyMilestones(newMilestones: NewMilestones): Promise<void> {
  await notifyMany(milestoneNotifications(newMilestones));
}

async function rebuildStatsAndNotifyMilestones(): Promise<RatingsByGame> {
  const { ratingsByGame, newMilestones } = await rebuildAllPlayerStats();
  await notifyMilestones(newMilestones);
  return ratingsByGame;
}

export async function onRoundsChanged(matchId: string): Promise<void> {
  const match = await recomputeMatchStandings(matchId);
  if (!match) return;
  await rebuildStatsAndNotifyMilestones();
}

function matchWonNotifications(
  matchId: string,
  match: StandingsMatch,
  ratingsByGame: RatingsByGame
): NotificationInput[] {
  const winners = rankAmongPlayed(match.standings).filter((s) => !s.isDnf && s.rank === 1);
  const game = ratingGameFor(match.gameType, match.gameLabel);
  const gameRatings = ratingsByGame.get(game.key);
  return winners.map((winner) => {
    const rating = gameRatings?.get(winner.playerId);
    const ratedThisMatch = rating?.lastMatchId === matchId;
    return {
      userId: winner.playerId,
      type: 'match-won',
      payload: {
        matchId,
        matchName: match.name,
        roundsPlayed: match.roundsPlayed,
        gameName: game.name,
        ratingDelta: ratedThisMatch ? rating.lastDelta : null,
        newRating: ratedThisMatch ? rating.rating : null,
      },
    };
  });
}

export async function onMatchEnded(matchId: string): Promise<void> {
  const match = await recomputeMatchStandings(matchId);
  if (!match) return;
  const ratingsByGame = await rebuildStatsAndNotifyMilestones();
  await notifyMany(matchWonNotifications(matchId, match, ratingsByGame));
}

export async function onMatchResumed(): Promise<void> {
  await rebuildStatsAndNotifyMilestones();
}
