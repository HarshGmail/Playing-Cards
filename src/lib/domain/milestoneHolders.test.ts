import { describe, it, expect } from 'vitest';
import { holdersByMilestone } from './milestoneHolders';

describe('holdersByMilestone', () => {
  it('groups players under each milestone, earliest unlock first', () => {
    const holders = holdersByMilestone([
      { userId: 'late', milestones: [{ id: 'gamesWon:10', achievedAt: '2026-03-01T00:00:00Z' }] },
      {
        userId: 'early',
        milestones: [
          { id: 'gamesWon:10', achievedAt: '2026-01-01T00:00:00Z' },
          { id: 'matchWins:1', achievedAt: new Date('2026-02-01T00:00:00Z') },
        ],
      },
    ]);
    expect(holders.get('gamesWon:10')!.map((h) => h.userId)).toEqual(['early', 'late']);
    expect(holders.get('matchWins:1')).toEqual([{ userId: 'early', achievedAt: '2026-02-01T00:00:00.000Z' }]);
    expect(holders.has('gamesWon:25')).toBe(false);
  });
});
