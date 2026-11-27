export interface PlayerMilestones {
  userId: string;
  milestones: Array<{ id: string; achievedAt: Date | string }>;
}

export interface MilestoneHolder {
  userId: string;
  achievedAt: string;
}

export function holdersByMilestone(players: PlayerMilestones[]): Map<string, MilestoneHolder[]> {
  const holders = new Map<string, MilestoneHolder[]>();
  for (const player of players) {
    for (const milestone of player.milestones) {
      if (!holders.has(milestone.id)) holders.set(milestone.id, []);
      holders.get(milestone.id)!.push({
        userId: player.userId,
        achievedAt: new Date(milestone.achievedAt).toISOString(),
      });
    }
  }
  holders.forEach((list) => list.sort((a, b) => Date.parse(a.achievedAt) - Date.parse(b.achievedAt)));
  return holders;
}
