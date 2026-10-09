export type MilestoneMetric =
  | 'gamesWon'
  | 'matchWins'
  | 'matchesPlayed'
  | 'gamesPlayed'
  | 'longestGameStreak'
  | 'longestMatchStreak'
  | 'longestDayStreak';

export type MilestoneStats = Record<MilestoneMetric, number>;

export interface MilestoneTrack {
  metric: MilestoneMetric;
  label: string;
  emoji: string;
  thresholds: number[];
  describe: (threshold: number) => string;
}

export interface Milestone {
  id: string;
  metric: MilestoneMetric;
  threshold: number;
  title: string;
  emoji: string;
}

export interface AchievedMilestone {
  id: string;
  achievedAt: Date | string;
}

export interface MilestoneProgress {
  track: MilestoneTrack;
  value: number;
  achieved: Milestone[];
  next: Milestone | null;
  progressToNext: number;
}

export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  const suffix = ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

export const MILESTONE_TRACKS: MilestoneTrack[] = [
  {
    metric: 'gamesWon',
    label: 'Game wins',
    emoji: '🥇',
    thresholds: [10, 25, 50, 75, 100, 150, 200, 300, 500],
    describe: (n) => `${ordinal(n)} game win`,
  },
  {
    metric: 'matchWins',
    label: 'Match wins',
    emoji: '👑',
    thresholds: [1, 5, 10, 25, 50, 100],
    describe: (n) => (n === 1 ? 'First match win' : `${n} match wins`),
  },
  {
    metric: 'matchesPlayed',
    label: 'Matches played',
    emoji: '🃏',
    thresholds: [1, 10, 25, 50, 100, 250],
    describe: (n) => (n === 1 ? 'First match played' : `${n} matches played`),
  },
  {
    metric: 'gamesPlayed',
    label: 'Games played',
    emoji: '🎴',
    thresholds: [50, 100, 250, 500, 1000],
    describe: (n) => `${n} games played`,
  },
  {
    metric: 'longestGameStreak',
    label: 'Game win streak',
    emoji: '🔥',
    thresholds: [3, 4, 5, 6],
    describe: (n) => (n === 3 ? 'First hat-trick' : `${n} game wins in a row`),
  },
  {
    metric: 'longestMatchStreak',
    label: 'Match win streak',
    emoji: '⚡',
    thresholds: [2, 3, 5],
    describe: (n) => `${n} match wins in a row`,
  },
  {
    metric: 'longestDayStreak',
    label: 'Days active streak',
    emoji: '📅',
    thresholds: [3, 7, 14, 30],
    describe: (n) => `${n}-day streak`,
  },
];

export function milestoneId(metric: MilestoneMetric, threshold: number): string {
  return `${metric}:${threshold}`;
}

function toMilestone(track: MilestoneTrack, threshold: number): Milestone {
  return {
    id: milestoneId(track.metric, threshold),
    metric: track.metric,
    threshold,
    title: track.describe(threshold),
    emoji: track.emoji,
  };
}

export const ALL_MILESTONES: Milestone[] = MILESTONE_TRACKS.flatMap((track) =>
  track.thresholds.map((threshold) => toMilestone(track, threshold))
);

const MILESTONES_BY_ID = new Map(ALL_MILESTONES.map((m) => [m.id, m]));

export function findMilestone(id: string): Milestone | null {
  return MILESTONES_BY_ID.get(id) ?? null;
}

export function reachedMilestones(stats: MilestoneStats): Milestone[] {
  return ALL_MILESTONES.filter((m) => stats[m.metric] >= m.threshold);
}

export function newlyReachedMilestones(
  stats: MilestoneStats,
  alreadyAchieved: Iterable<string>
): Milestone[] {
  const known = new Set(alreadyAchieved);
  return reachedMilestones(stats).filter((m) => !known.has(m.id));
}

export function mergeAchieved(
  existing: AchievedMilestone[],
  reached: Milestone[],
  achievedAt: Date
): AchievedMilestone[] {
  const known = new Set(existing.map((m) => m.id));
  const added = reached.filter((m) => !known.has(m.id)).map((m) => ({ id: m.id, achievedAt }));
  return [...existing, ...added];
}

export function milestoneProgress(
  stats: MilestoneStats,
  achievedIds: Iterable<string>
): MilestoneProgress[] {
  const achievedSet = new Set(achievedIds);
  return MILESTONE_TRACKS.map((track) => {
    const value = stats[track.metric];
    const all = track.thresholds.map((threshold) => toMilestone(track, threshold));
    const achieved = all.filter((m) => achievedSet.has(m.id) || value >= m.threshold);
    const next = all.find((m) => !achievedSet.has(m.id) && value < m.threshold) ?? null;
    const previousThreshold = achieved.length > 0 ? achieved[achieved.length - 1].threshold : 0;
    const progressToNext = next
      ? Math.min(1, Math.max(0, (value - previousThreshold) / (next.threshold - previousThreshold)))
      : 1;
    return { track, value, achieved, next, progressToNext };
  });
}
