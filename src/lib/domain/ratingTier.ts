export type RatingTierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface TierThreshold {
  name: RatingTierName;
  below: number;
}

export const TIER_THRESHOLDS: TierThreshold[] = [
  { name: 'Bronze', below: 1100 },
  { name: 'Silver', below: 1250 },
  { name: 'Gold', below: 1400 },
  { name: 'Platinum', below: 1550 },
];

export const TOP_TIER: RatingTierName = 'Diamond';

export const TIER_BADGE_CLASSES: Record<RatingTierName, string> = {
  Bronze: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Silver: 'bg-slate-200 text-slate-700 dark:bg-slate-600/50 dark:text-slate-200',
  Gold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  Platinum: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  Diamond: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
};

export function getRatingTier(rating: number): RatingTierName {
  const match = TIER_THRESHOLDS.find((tier) => rating < tier.below);
  return match ? match.name : TOP_TIER;
}

export function formatWinPct(winPct: number): string {
  return `${Math.round(winPct * 100)}%`;
}
