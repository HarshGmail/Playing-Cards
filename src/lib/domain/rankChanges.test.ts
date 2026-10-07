import { describe, it, expect } from 'vitest';
import { computeRankChanges, hasRankMovement, rankOrderSignature } from './rankChanges';

const player = (playerId: string, position: number, isDnf = false) => ({
  playerId,
  position,
  isDnf,
});

describe('computeRankChanges', () => {
  it('reports a 2nd-to-1st swap as a new leader with a positive delta', () => {
    const changes = computeRankChanges(
      [player('a', 1), player('b', 2), player('c', 3)],
      [player('b', 1), player('a', 2), player('c', 3)]
    );

    expect(changes.get('b')).toEqual({
      playerId: 'b',
      from: 2,
      to: 1,
      delta: 1,
      enteredTop3: false,
      leftTop3: false,
      isNewLeader: true,
    });
    expect(changes.get('a')).toMatchObject({ from: 1, to: 2, delta: -1, isNewLeader: false });
    expect(changes.get('c')).toMatchObject({ delta: 0, isNewLeader: false });
  });

  it('flags a climb from 5th into the top three and the player it displaces', () => {
    const changes = computeRankChanges(
      [player('a', 1), player('b', 2), player('c', 3), player('d', 4), player('e', 5)],
      [player('a', 1), player('e', 2), player('b', 3), player('c', 4), player('d', 5)]
    );

    expect(changes.get('e')).toMatchObject({ from: 5, to: 2, delta: 3, enteredTop3: true });
    expect(changes.get('c')).toMatchObject({ from: 3, to: 4, delta: -1, leftTop3: true });
    expect(changes.get('b')).toMatchObject({ enteredTop3: false, leftTop3: false });
  });

  it('treats a podium player who drops out as leaving the top three', () => {
    const changes = computeRankChanges(
      [player('a', 1), player('b', 2), player('c', 3), player('d', 4)],
      [player('a', 1), player('c', 2), player('d', 3), player('b', 4, true)]
    );

    expect(changes.get('b')).toMatchObject({ leftTop3: true, delta: -2 });
    expect(changes.get('d')).toMatchObject({ enteredTop3: true });
  });

  it('does not celebrate players with no previous position', () => {
    const changes = computeRankChanges([], [player('a', 1), player('b', 2)]);

    expect(changes.get('a')).toMatchObject({
      from: null,
      delta: 0,
      enteredTop3: false,
      isNewLeader: false,
    });
    expect(hasRankMovement(changes)).toBe(false);
  });

  it('keeps a tied leader who stays first from being announced as new', () => {
    const changes = computeRankChanges(
      [player('a', 1), player('b', 1), player('c', 3)],
      [player('b', 1), player('a', 1), player('c', 3)]
    );

    expect(changes.get('a')).toMatchObject({ delta: 0, isNewLeader: false });
    expect(changes.get('b')).toMatchObject({ delta: 0, isNewLeader: false });
    expect(hasRankMovement(changes)).toBe(false);
  });

  it('marks a player joining a shared first place as a new leader', () => {
    const changes = computeRankChanges(
      [player('a', 1), player('b', 2)],
      [player('a', 1), player('b', 1)]
    );

    expect(changes.get('b')).toMatchObject({ delta: 1, isNewLeader: true });
    expect(hasRankMovement(changes)).toBe(true);
  });
});

describe('rankOrderSignature', () => {
  it('changes when order, positions or DNF status change', () => {
    const base = rankOrderSignature([player('a', 1), player('b', 2)]);

    expect(rankOrderSignature([player('a', 1), player('b', 2)])).toBe(base);
    expect(rankOrderSignature([player('b', 1), player('a', 2)])).not.toBe(base);
    expect(rankOrderSignature([player('a', 1), player('b', 1)])).not.toBe(base);
    expect(rankOrderSignature([player('a', 1), player('b', 2, true)])).not.toBe(base);
  });
});
