import { findMilestone, type Milestone } from './milestones';

export const CELEBRATION_HEADLINES = [
  'Yay!!',
  'Woohoo!!',
  "Let's gooo!!",
  'Boom!!',
  'Legendary!!',
  'Yesss!!',
  'Hurrah!!',
  'Get in!!',
];

export interface MilestoneCelebration {
  headline: string;
  cheer: string;
}

export interface UnseenMilestoneSource {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface UnseenMilestone {
  notificationId: string;
  milestone: Milestone;
}

function seedOf(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickAt<T>(options: T[], offset: number): T {
  return options[offset % options.length];
}

export function celebrationFor(milestone: Milestone, position: number): MilestoneCelebration {
  const offset = seedOf(milestone.id) + position;
  return {
    headline: pickAt(CELEBRATION_HEADLINES, offset),
    cheer: pickAt(milestone.cheers, offset),
  };
}

function milestoneIdOf(payload: Record<string, unknown>): string {
  return typeof payload.milestoneId === 'string' ? payload.milestoneId : '';
}

export function unseenMilestonesFrom(notifications: UnseenMilestoneSource[]): UnseenMilestone[] {
  const seen = new Set<string>();
  return notifications
    .filter((n) => n.type === 'milestone' && !n.read)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .flatMap((n) => {
      const milestone = findMilestone(milestoneIdOf(n.payload));
      if (!milestone || seen.has(milestone.id)) return [];
      seen.add(milestone.id);
      return [{ notificationId: n.id, milestone }];
    });
}
