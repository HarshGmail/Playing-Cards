import { notifyMany, NotificationInput } from '@/lib/notifications/create';
import { rankAmongPlayed } from '@/lib/domain/playerStats';
import { recomputeMatchStandings, StandingsMatch } from '@/lib/stats/standings';
import {
  NewMilestones,
  rebuildAllPlayerStats,
  RatingChanges,
} from '@/lib/stats/playerStats';

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

async function rebuildStatsAndNotifyMilestones(): Promise<RatingChanges> {
  const { ratingChanges, newMilestones } = await rebuildAllPlayerStats();
  await notifyMilestones(newMilestones);
  return ratingChanges;
}

export async function onRoundsChanged(matchId: string): Promise<void> {
  const match = await recomputeMatchStandings(matchId);
  if (!match) return;
  await rebuildStatsAndNotifyMilestones();
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
  const ratingChanges = await rebuildStatsAndNotifyMilestones();
  await notifyMany(matchWonNotifications(matchId, match, ratingChanges));
}

export async function onMatchResumed(): Promise<void> {
  await rebuildStatsAndNotifyMilestones();
}
