import {
  expectedScore,
  roundsWeight,
  START_RATING,
  MAX_ROUNDS_WEIGHT,
  ROUNDS_WEIGHT_BASE,
  ROUNDS_WEIGHT_PER_ROUND,
} from './rating';
import { TIER_THRESHOLDS, TOP_TIER, type RatingTierName } from './ratingTier';

export interface TierRange {
  name: RatingTierName;
  min: number | null;
  max: number | null;
}

export interface WinChance {
  gap: number;
  chance: number;
}

export interface RoundsWeightRow {
  rounds: number;
  weight: number;
}

export function tierRanges(): TierRange[] {
  const bounded = TIER_THRESHOLDS.map((tier, index) => ({
    name: tier.name,
    min: index === 0 ? null : TIER_THRESHOLDS[index - 1].below,
    max: tier.below - 1,
  }));
  const highestThreshold = TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1].below;
  return [...bounded, { name: TOP_TIER, min: highestThreshold, max: null }];
}

export function formatTierRange({ min, max }: TierRange): string {
  if (min === null && max !== null) return `Below ${max + 1}`;
  if (max === null && min !== null) return `${min}+`;
  return `${min}–${max}`;
}

export function winChanceByGap(gaps: number[]): WinChance[] {
  return gaps.map((gap) => ({ gap, chance: expectedScore(START_RATING + gap, START_RATING) }));
}

export function weightByRounds(rounds: number[]): RoundsWeightRow[] {
  return rounds.map((count) => ({ rounds: count, weight: roundsWeight(count) }));
}

export function roundsAtMaxWeight(): number {
  return Math.round((MAX_ROUNDS_WEIGHT - ROUNDS_WEIGHT_BASE) / ROUNDS_WEIGHT_PER_ROUND);
}

export function formatDelta(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return `${rounded}`;
  return '±0';
}
