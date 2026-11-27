export type MilestoneMetric =
  | 'gamesWon'
  | 'matchWins'
  | 'matchesPlayed'
  | 'gamesPlayed'
  | 'podiumFinishes'
  | 'peakRating'
  | 'longestGameStreak'
  | 'longestMatchStreak'
  | 'longestDayStreak';

export type MilestoneStats = Record<MilestoneMetric, number>;

export type MilestoneColor =
  | 'amber'
  | 'violet'
  | 'sky'
  | 'indigo'
  | 'orange'
  | 'emerald'
  | 'rose'
  | 'fuchsia'
  | 'teal';

export type MilestoneTier = 'Bronze' | 'Silver' | 'Gold' | 'Legend';

export const MILESTONE_TIERS: MilestoneTier[] = ['Bronze', 'Silver', 'Gold', 'Legend'];

export interface MilestoneLevel {
  threshold: number;
  hero: string;
}

export interface MilestoneTrack {
  metric: MilestoneMetric;
  label: string;
  emoji: string;
  color: MilestoneColor;
  levels: MilestoneLevel[];
  describe: (threshold: number) => string;
  cheers: string[];
}

export interface Milestone {
  id: string;
  metric: MilestoneMetric;
  threshold: number;
  title: string;
  emoji: string;
  trackLabel: string;
  color: MilestoneColor;
  tier: MilestoneTier;
  levelIndex: number;
  levelCount: number;
  cheers: string[];
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

export function tierFor(levelIndex: number, levelCount: number): MilestoneTier {
  const tierIndex = Math.min(MILESTONE_TIERS.length - 1, Math.floor((levelIndex * MILESTONE_TIERS.length) / levelCount));
  return MILESTONE_TIERS[tierIndex];
}

export const MILESTONE_TRACKS: MilestoneTrack[] = [
  {
    metric: 'gamesWon',
    label: 'Game wins',
    emoji: '🥇',
    color: 'amber',
    levels: [
      { threshold: 10, hero: '🎯' },
      { threshold: 25, hero: '🎲' },
      { threshold: 50, hero: '🤓' },
      { threshold: 75, hero: '🦹' },
      { threshold: 100, hero: '💯' },
      { threshold: 150, hero: '🥷' },
      { threshold: 200, hero: '🦸' },
      { threshold: 300, hero: '🧙' },
      { threshold: 500, hero: '🐐' },
    ],
    describe: (n) => `${ordinal(n)} game win`,
    cheers: [
      'Another one off the table',
      'The scoreboard is sweating',
      'Cards are scared of you now',
      'That round belonged to you',
    ],
  },
  {
    metric: 'matchWins',
    label: 'Match wins',
    emoji: '👑',
    color: 'violet',
    levels: [
      { threshold: 1, hero: '🌟' },
      { threshold: 5, hero: '🤴' },
      { threshold: 10, hero: '👑' },
      { threshold: 25, hero: '🎩' },
      { threshold: 50, hero: '🦁' },
      { threshold: 100, hero: '🏆' },
    ],
    describe: (n) => (n === 1 ? 'First match win' : `${n} match wins`),
    cheers: [
      'The whole table bowed',
      'The crown is getting heavy',
      'Match taken, no questions asked',
      'Trophy shelf needs more room',
    ],
  },
  {
    metric: 'matchesPlayed',
    label: 'Matches played',
    emoji: '🃏',
    color: 'sky',
    levels: [
      { threshold: 1, hero: '🎬' },
      { threshold: 10, hero: '🪑' },
      { threshold: 25, hero: '🍿' },
      { threshold: 50, hero: '🎟️' },
      { threshold: 100, hero: '📚' },
      { threshold: 250, hero: '🏟️' },
    ],
    describe: (n) => (n === 1 ? 'First match played' : `${n} matches played`),
    cheers: [
      'You showed up, and that counts',
      'Regular at the card table',
      'Pull up a chair, legend',
      'The table misses you when you are gone',
    ],
  },
  {
    metric: 'gamesPlayed',
    label: 'Games played',
    emoji: '🎴',
    color: 'indigo',
    levels: [
      { threshold: 50, hero: '🎴' },
      { threshold: 100, hero: '🃏' },
      { threshold: 250, hero: '🎰' },
      { threshold: 500, hero: '🧩' },
      { threshold: 1000, hero: '🌍' },
    ],
    describe: (n) => `${n} games played`,
    cheers: [
      'Dealt, shuffled and played',
      'Hands full of experience',
      'The deck is well worn now',
      'Card-table veteran',
    ],
  },
  {
    metric: 'podiumFinishes',
    label: 'Podium finishes',
    emoji: '🥉',
    color: 'orange',
    levels: [
      { threshold: 1, hero: '🥉' },
      { threshold: 5, hero: '🎖️' },
      { threshold: 10, hero: '🥈' },
      { threshold: 25, hero: '🏅' },
      { threshold: 50, hero: '🎗️' },
    ],
    describe: (n) => (n === 1 ? 'First podium finish' : `${n} podium finishes`),
    cheers: [
      'Top three, again',
      'The medal count goes up',
      'Rarely off the podium',
      'Silverware-worthy finish',
    ],
  },
  {
    metric: 'peakRating',
    label: 'Peak rating',
    emoji: '📈',
    color: 'emerald',
    levels: [
      { threshold: 1300, hero: '📈' },
      { threshold: 1400, hero: '🧗' },
      { threshold: 1500, hero: '🏔️' },
      { threshold: 1600, hero: '🚀' },
    ],
    describe: (n) => `Peak rating ${n}`,
    cheers: [
      'Higher than you have ever been',
      'New personal ceiling',
      'The rating chart is climbing',
      'Up where the air is thin',
    ],
  },
  {
    metric: 'longestGameStreak',
    label: 'Game win streak',
    emoji: '🔥',
    color: 'rose',
    levels: [
      { threshold: 3, hero: '🔥' },
      { threshold: 4, hero: '🌋' },
      { threshold: 5, hero: '☄️' },
      { threshold: 6, hero: '🚀' },
    ],
    describe: (n) => (n === 3 ? 'First hat-trick' : `${n} game wins in a row`),
    cheers: [
      'Unstoppable run',
      'Flames on the table',
      'Nobody could break that streak',
      'Hot hand, cold table',
    ],
  },
  {
    metric: 'longestMatchStreak',
    label: 'Match win streak',
    emoji: '⚡',
    color: 'fuchsia',
    levels: [
      { threshold: 2, hero: '⚡' },
      { threshold: 3, hero: '🌪️' },
      { threshold: 5, hero: '🦅' },
    ],
    describe: (n) => `${n} match wins in a row`,
    cheers: [
      'Momentum is real',
      'Matches keep falling your way',
      'Storm of wins',
      'Eagle-eyed streak',
    ],
  },
  {
    metric: 'longestDayStreak',
    label: 'Days active streak',
    emoji: '📅',
    color: 'teal',
    levels: [
      { threshold: 3, hero: '🌱' },
      { threshold: 7, hero: '📅' },
      { threshold: 14, hero: '🗓️' },
      { threshold: 30, hero: '🌟' },
    ],
    describe: (n) => `${n}-day streak`,
    cheers: [
      'Showing up every single day',
      'The habit is real',
      'The calendar is full of ticks',
      'Consistency pays off',
    ],
  },
];

export function milestoneId(metric: MilestoneMetric, threshold: number): string {
  return `${metric}:${threshold}`;
}

function toMilestone(track: MilestoneTrack, levelIndex: number): Milestone {
  const level = track.levels[levelIndex];
  return {
    id: milestoneId(track.metric, level.threshold),
    metric: track.metric,
    threshold: level.threshold,
    title: track.describe(level.threshold),
    emoji: level.hero,
    trackLabel: track.label,
    color: track.color,
    tier: tierFor(levelIndex, track.levels.length),
    levelIndex,
    levelCount: track.levels.length,
    cheers: track.cheers,
  };
}

function milestonesOf(track: MilestoneTrack): Milestone[] {
  return track.levels.map((_, levelIndex) => toMilestone(track, levelIndex));
}

export const ALL_MILESTONES: Milestone[] = MILESTONE_TRACKS.flatMap(milestonesOf);

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
    const all = milestonesOf(track);
    const achieved = all.filter((m) => achievedSet.has(m.id) || value >= m.threshold);
    const next = all.find((m) => !achievedSet.has(m.id) && value < m.threshold) ?? null;
    const progressToNext = next ? Math.min(1, Math.max(0, value / next.threshold)) : 1;
    return { track, value, achieved, next, progressToNext };
  });
}
