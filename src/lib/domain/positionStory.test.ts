import { describe, it, expect } from 'vitest';
import { buildPositionStory, describeRace } from './positionStory';
import type { RoundPositions } from './positionHistory';

function standings(...rounds: Array<Record<string, number>>): RoundPositions[] {
  return rounds.map((positions, index) => ({
    round: index + 1,
    positions: new Map(Object.entries(positions)),
    totals: new Map(),
  }));
}

describe('buildPositionStory', () => {
  it('returns an empty story for a match with no rounds', () => {
    const story = buildPositionStory([]);

    expect(story.leadChanges).toBe(0);
    expect(story.mostRoundsLed).toBeNull();
    expect(story.biggestClimb).toBeNull();
    expect(story.biggestDrop).toBeNull();
    expect(story.soleLeader).toBeNull();
    expect(story.currentLeaderIds).toEqual([]);
  });

  it('counts a lead change each round someone new reaches 1st', () => {
    const story = buildPositionStory(
      standings({ a: 1, b: 2 }, { a: 2, b: 1 }, { a: 2, b: 1 }, { a: 1, b: 2 })
    );

    expect(story.leadChanges).toBe(2);
    expect(Array.from(story.newLeadersByRound.keys())).toEqual([2, 4]);
    expect(story.newLeadersByRound.get(2)).toEqual(new Set(['b']));
    expect(story.newLeadersByRound.get(4)).toEqual(new Set(['a']));
  });

  it('treats drawing level with the leader as taking a share of the lead', () => {
    const story = buildPositionStory(standings({ a: 1, b: 2 }, { a: 1, b: 1 }));

    expect(story.newLeadersByRound.get(2)).toEqual(new Set(['b']));
    expect(story.currentLeaderIds.sort()).toEqual(['a', 'b']);
    expect(story.soleLeader).toBeNull();
  });

  it('finds who spent the most rounds in 1st', () => {
    const story = buildPositionStory(
      standings({ a: 1, b: 2 }, { a: 2, b: 1 }, { a: 2, b: 1 }, { a: 2, b: 1 })
    );

    expect(story.mostRoundsLed).toEqual({ playerId: 'b', count: 3 });
  });

  it('finds the biggest single-round climb and drop', () => {
    const story = buildPositionStory(
      standings(
        { a: 1, b: 2, c: 3, d: 4 },
        { a: 2, b: 1, c: 3, d: 4 },
        { a: 4, b: 2, c: 3, d: 1 }
      )
    );

    expect(story.biggestClimb).toEqual({ playerId: 'd', round: 3, from: 4, to: 1 });
    expect(story.biggestDrop).toEqual({ playerId: 'a', round: 3, from: 2, to: 4 });
  });

  it('finds who changed position most often', () => {
    const story = buildPositionStory(
      standings({ a: 1, b: 2, c: 3 }, { a: 2, b: 1, c: 3 }, { a: 1, b: 2, c: 3 })
    );

    expect(story.mostPositionChanges?.count).toBe(2);
    expect(['a', 'b']).toContain(story.mostPositionChanges?.playerId);
  });

  it('ignores a player who joins mid-match when measuring moves', () => {
    const story = buildPositionStory(standings({ a: 1 }, { a: 2, late: 1 }));

    expect(story.biggestDrop).toEqual({ playerId: 'a', round: 2, from: 1, to: 2 });
    expect(story.biggestClimb).toBeNull();
  });

  it('tracks how long the sole leader has held 1st and their worst position', () => {
    const story = buildPositionStory(
      standings(
        { a: 1, b: 2, c: 3 },
        { a: 2, b: 3, c: 1 },
        { a: 2, b: 1, c: 3 },
        { a: 3, b: 1, c: 2 }
      )
    );

    expect(story.soleLeader).toEqual({
      playerId: 'b',
      sinceRound: 3,
      worstPosition: 3,
      worstRound: 2,
    });
  });

  it('reports a wire-to-wire leader as leading since the first round', () => {
    const story = buildPositionStory(standings({ a: 1, b: 2 }, { a: 1, b: 2 }));

    expect(story.leadChanges).toBe(0);
    expect(story.soleLeader).toEqual({
      playerId: 'a',
      sinceRound: 1,
      worstPosition: 1,
      worstRound: 2,
    });
  });
});

describe('describeRace', () => {
  const nameOf = (playerId: string) => playerId.toUpperCase();
  const context = (history: RoundPositions[], ended = false) => ({
    nameOf,
    ended,
    firstRound: history[0].round,
    lastRound: history[history.length - 1].round,
  });
  const headline = (history: RoundPositions[], ended = false) =>
    describeRace(buildPositionStory(history), context(history, ended));

  it('calls out a comeback leader and how long they have held 1st', () => {
    const history = standings(
      { a: 1, b: 2, c: 3 },
      { a: 2, b: 3, c: 1 },
      { a: 2, b: 1, c: 3 },
      { a: 3, b: 1, c: 2 }
    );

    expect(headline(history)).toBe('B climbed from 3rd in R2 to the top and has held it since R3');
    expect(headline(history, true)).toBe('B climbed from 3rd in R2 to the top and held it since R3');
  });

  it('calls out a wire-to-wire leader', () => {
    const history = standings({ a: 1, b: 2 }, { a: 1, b: 2 });

    expect(headline(history)).toBe('A has led every round so far');
    expect(headline(history, true)).toBe('A led wire to wire');
  });

  it('calls out a lead taken in the latest round', () => {
    const history = standings({ a: 1, b: 2 }, { a: 2, b: 1 });

    expect(headline(history)).toBe('B takes the lead in R2');
    expect(headline(history, true)).toBe('B snatched the lead in the final round');
  });

  it('names a regained lead without calling it a comeback', () => {
    const history = standings({ a: 1, b: 2 }, { a: 2, b: 1 }, { a: 1, b: 2 }, { a: 1, b: 2 });

    expect(headline(history)).toBe('A has held the top spot since R3');
  });

  it('describes a shared lead', () => {
    expect(headline(standings({ a: 1, b: 1, c: 3 }))).toBe('A and B are level at the top');
    expect(headline(standings({ a: 1, b: 1, c: 1 }))).toBe('3-way tie at the top');
  });
});
