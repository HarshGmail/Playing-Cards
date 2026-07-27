import { describe, it, expect } from 'vitest';
import { computeLeaderboard, buildAggregates } from './ranking';

describe('ranking', () => {
  it('should compute correct leaderboard with tiebreakers', () => {
    // Worked example from spec
    const scoresByPlayer = new Map([
      ['p1', { scores: [20, 0, 10, 25], isDnf: false }],
      ['p2', { scores: [20, 30, 0, 5], isDnf: false }],
      ['p3', { scores: [0, 60, 30, 45], isDnf: false }],
      ['p4', { scores: [45, 45, 45, 0], isDnf: false }],
    ]);

    const aggregates = buildAggregates(scoresByPlayer);

    // Verify aggregates
    expect(aggregates.find(a => a.playerId === 'p1')).toMatchObject({
      total: 55,
      average: 13.75,
      roundsPlayed: 4,
    });
    expect(aggregates.find(a => a.playerId === 'p2')).toMatchObject({
      total: 55,
      average: 13.75,
      roundsPlayed: 4,
    });
    expect(aggregates.find(a => a.playerId === 'p3')).toMatchObject({
      total: 135,
      average: 33.75,
      roundsPlayed: 4,
    });
    expect(aggregates.find(a => a.playerId === 'p4')).toMatchObject({
      total: 135,
      average: 33.75,
      roundsPlayed: 4,
    });

    // Verify stdDev
    const p1Agg = aggregates.find(a => a.playerId === 'p1')!;
    const p2Agg = aggregates.find(a => a.playerId === 'p2')!;
    const p3Agg = aggregates.find(a => a.playerId === 'p3')!;
    const p4Agg = aggregates.find(a => a.playerId === 'p4')!;

    expect(p1Agg.stdDev).toBeCloseTo(9.55, 1);
    expect(p2Agg.stdDev).toBeCloseTo(12.03, 1);
    expect(p3Agg.stdDev).toBeCloseTo(21.65, 1);
    expect(p4Agg.stdDev).toBeCloseTo(19.49, 1);

    // Compute leaderboard with tiebreakers
    const tiebreakers = ['more-consistent', 'lower-average', 'less-consistent'];
    const leaderboard = computeLeaderboard(
      aggregates,
      'lowest-first',
      tiebreakers
    );

    // Set names for comparison
    const positions = leaderboard.map(e => e.playerId);
    expect(positions).toEqual(['p1', 'p2', 'p4', 'p3']);

    // Verify positions
    const p1Entry = leaderboard.find(e => e.playerId === 'p1')!;
    const p2Entry = leaderboard.find(e => e.playerId === 'p2')!;
    const p4Entry = leaderboard.find(e => e.playerId === 'p4')!;
    const p3Entry = leaderboard.find(e => e.playerId === 'p3')!;

    expect(p1Entry.position).toBe(1);
    expect(p2Entry.position).toBe(2);
    expect(p4Entry.position).toBe(3);
    expect(p3Entry.position).toBe(4);

    // Verify gaps
    expect(p2Entry.gapToAhead).toBe(0);
    expect(p4Entry.gapToLeader).toBe(80);
  });

  it('should handle shared positions', () => {
    const scoresByPlayer = new Map([
      ['p1', { scores: [10, 20], isDnf: false }],
      ['p2', { scores: [10, 20], isDnf: false }],
      ['p3', { scores: [5, 5], isDnf: false }],
    ]);

    const aggregates = buildAggregates(scoresByPlayer);
    const leaderboard = computeLeaderboard(aggregates, 'highest-first', []);

    const p1Entry = leaderboard.find(e => e.playerId === 'p1')!;
    const p2Entry = leaderboard.find(e => e.playerId === 'p2')!;
    const p3Entry = leaderboard.find(e => e.playerId === 'p3')!;

    expect(p1Entry.position).toBe(1);
    expect(p2Entry.position).toBe(1);
    expect(p3Entry.position).toBe(3);
  });

  it('should identify last active player', () => {
    const scoresByPlayer = new Map([
      ['p1', { scores: [100], isDnf: false }],
      ['p2', { scores: [50], isDnf: false }],
      ['p3', { scores: [10], isDnf: true }],
    ]);

    const aggregates = buildAggregates(scoresByPlayer);
    const leaderboard = computeLeaderboard(aggregates, 'highest-first', []);

    const p1Entry = leaderboard.find(e => e.playerId === 'p1')!;
    const p2Entry = leaderboard.find(e => e.playerId === 'p2')!;
    const p3Entry = leaderboard.find(e => e.playerId === 'p3')!;

    expect(p1Entry.isLast).toBe(false);
    expect(p2Entry.isLast).toBe(true);
    expect(p3Entry.isLast).toBe(false);
  });

  it('should handle zero-state (no rounds)', () => {
    const scoresByPlayer = new Map([
      ['p1', { scores: [], isDnf: false }],
      ['p2', { scores: [], isDnf: false }],
    ]);

    const aggregates = buildAggregates(scoresByPlayer);
    const leaderboard = computeLeaderboard(aggregates, 'highest-first', []);

    expect(leaderboard.every(e => e.total === 0)).toBe(true);
    expect(leaderboard.every(e => e.roundsPlayed === 0)).toBe(true);
  });

  it('should handle stdDev with single round', () => {
    const scoresByPlayer = new Map([
      ['p1', { scores: [25], isDnf: false }],
    ]);

    const aggregates = buildAggregates(scoresByPlayer);
    expect(aggregates[0].stdDev).toBe(0);
  });
});
