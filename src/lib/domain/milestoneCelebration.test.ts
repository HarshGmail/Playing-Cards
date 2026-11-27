import { describe, it, expect } from 'vitest';
import { CELEBRATION_HEADLINES, celebrationFor, unseenMilestonesFrom } from './milestoneCelebration';
import { findMilestone, milestoneId } from './milestones';

const gamesWon10 = findMilestone(milestoneId('gamesWon', 10))!;

describe('celebrationFor', () => {
  it('never repeats the headline or cheer between consecutive banners', () => {
    const shown = [0, 1, 2, 3, 4, 5].map((position) => celebrationFor(gamesWon10, position));
    for (let i = 1; i < shown.length; i += 1) {
      expect(shown[i].headline).not.toBe(shown[i - 1].headline);
      expect(shown[i].cheer).not.toBe(shown[i - 1].cheer);
    }
  });

  it('draws headlines from the shared pool and cheers from the milestone track', () => {
    const { headline, cheer } = celebrationFor(gamesWon10, 0);
    expect(CELEBRATION_HEADLINES).toContain(headline);
    expect(gamesWon10.cheers).toContain(cheer);
  });
});

describe('unseenMilestonesFrom', () => {
  const note = (id: string, milestoneId: string, read: boolean, createdAt: string) => ({
    id,
    type: 'milestone',
    read,
    createdAt,
    payload: { milestoneId },
  });

  it('keeps only unread milestone notifications, oldest first', () => {
    const queue = unseenMilestonesFrom([
      note('n2', 'gamesWon:25', false, '2026-03-02T00:00:00Z'),
      note('n1', 'gamesWon:10', false, '2026-03-01T00:00:00Z'),
      note('n3', 'matchWins:1', true, '2026-03-03T00:00:00Z'),
      { id: 'n4', type: 'match-won', read: false, createdAt: '2026-03-04T00:00:00Z', payload: {} },
    ]);
    expect(queue.map((q) => q.notificationId)).toEqual(['n1', 'n2']);
    expect(queue.map((q) => q.milestone.id)).toEqual(['gamesWon:10', 'gamesWon:25']);
  });

  it('drops unknown milestone ids and duplicates of the same milestone', () => {
    const queue = unseenMilestonesFrom([
      note('a', 'gamesWon:10', false, '2026-03-01T00:00:00Z'),
      note('b', 'gamesWon:10', false, '2026-03-02T00:00:00Z'),
      note('c', 'retired:1', false, '2026-03-03T00:00:00Z'),
    ]);
    expect(queue.map((q) => q.notificationId)).toEqual(['a']);
  });
});
