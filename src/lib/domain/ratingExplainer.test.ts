import { describe, it, expect } from 'vitest';
import {
  tierRanges,
  formatTierRange,
  winChanceByGap,
  weightByRounds,
  roundsAtMaxWeight,
  formatDelta,
} from './ratingExplainer';
import { roundsWeight, MAX_ROUNDS_WEIGHT } from './rating';

describe('tierRanges', () => {
  it('covers every rating with contiguous, non-overlapping ranges', () => {
    const ranges = tierRanges();
    expect(ranges[0].min).toBeNull();
    expect(ranges[ranges.length - 1].max).toBeNull();
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i].min).toBe((ranges[i - 1].max as number) + 1);
    }
  });

  it('formats open and closed ranges', () => {
    const [bronze, silver] = tierRanges();
    const diamond = tierRanges().at(-1)!;
    expect(formatTierRange(bronze)).toBe('Below 1100');
    expect(formatTierRange(silver)).toBe('1100–1249');
    expect(formatTierRange(diamond)).toBe('1550+');
  });
});

describe('winChanceByGap', () => {
  it('is even for equal ratings and rises with the gap', () => {
    const [even, small, large] = winChanceByGap([0, 100, 400]);
    expect(even.chance).toBeCloseTo(0.5);
    expect(small.chance).toBeGreaterThan(even.chance);
    expect(large.chance).toBeGreaterThan(small.chance);
  });
});

describe('weightByRounds', () => {
  it('mirrors roundsWeight', () => {
    expect(weightByRounds([3, 10])).toEqual([
      { rounds: 3, weight: roundsWeight(3) },
      { rounds: 10, weight: roundsWeight(10) },
    ]);
  });
});

describe('roundsAtMaxWeight', () => {
  it('is the first round count that hits the cap', () => {
    const cap = roundsAtMaxWeight();
    expect(roundsWeight(cap)).toBeCloseTo(MAX_ROUNDS_WEIGHT);
    expect(roundsWeight(cap - 1)).toBeLessThan(MAX_ROUNDS_WEIGHT);
  });
});

describe('formatDelta', () => {
  it('signs and rounds', () => {
    expect(formatDelta(11.4)).toBe('+11');
    expect(formatDelta(-9.6)).toBe('-10');
    expect(formatDelta(0.3)).toBe('±0');
    expect(formatDelta(-0.3)).toBe('±0');
  });
});
