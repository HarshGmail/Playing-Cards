import { describe, it, expect } from 'vitest';
import {
  buildRoundMoment,
  hasShuffle,
  latestRoundNumber,
  milestoneTagline,
  momentFromRounds,
  momentHeadline,
  momentSubline,
  roundContextFor,
  streakCheer,
  type MomentPlayer,
} from './roundMoments';

function player(playerId: string, name: string, position: number, total = 0): MomentPlayer {
  return { playerId, name, position, total, isDnf: false };
}

describe('buildRoundMoment', () => {
  const before = [player('h', 'Harsh Vardhan', 2), player('v', 'Vinay Nesta', 1), player('b', 'Bot', 3)];

  it('finds who climbed and who dropped', () => {
    const after = [player('h', 'Harsh Vardhan', 1), player('v', 'Vinay Nesta', 2), player('b', 'Bot', 3)];
    const moment = buildRoundMoment(before, after, new Map(), new Map())!;
    expect(moment.climbers).toEqual([{ playerId: 'h', name: 'Harsh Vardhan', from: 2, to: 1 }]);
    expect(moment.fallers).toEqual([{ playerId: 'v', name: 'Vinay Nesta', from: 1, to: 2 }]);
    expect(hasShuffle(moment)).toBe(true);
    expect(momentHeadline(moment, 0)).toBe('Come on, Harsh! Up to 1st.');
    expect(momentSubline(moment)).toBe("Vinay, it's not over — gear up!");
  });

  it('cheers a growing streak even when nobody moved', () => {
    const moment = buildRoundMoment(before, before, new Map([['h', 1]]), new Map([['h', 2]]))!;
    expect(hasShuffle(moment)).toBe(false);
    expect(moment.streaks).toEqual([{ playerId: 'h', name: 'Harsh Vardhan', from: 1, to: 2 }]);
    expect(momentHeadline(moment, 0)).toBe("Come on, Harsh — 2 in a row, let's go!");
  });

  it('stays quiet when nothing changed and no streak is building', () => {
    expect(buildRoundMoment(before, before, new Map([['h', 1]]), new Map([['h', 1]]))).toBeNull();
    expect(buildRoundMoment(before, before, new Map(), new Map([['h', 1]]))).toBeNull();
  });

  it('names every climber when several moved up', () => {
    const after = [player('h', 'Harsh', 1), player('b', 'Bot', 2), player('v', 'Vinay', 3)];
    const moment = buildRoundMoment(
      [player('h', 'Harsh', 2), player('b', 'Bot', 3), player('v', 'Vinay', 1)],
      after,
      new Map(),
      new Map()
    )!;
    expect(momentHeadline(moment, 0)).toBe('Come on, Harsh & Bot! The table just shook.');
  });

  it('varies the wording by round', () => {
    const note = { playerId: 'h', name: 'Harsh', from: 2, to: 3 };
    expect(new Set([0, 1, 2].map((round) => streakCheer(note, round))).size).toBe(3);
  });
});

describe('milestoneTagline', () => {
  const quiet = { wonRound: false, wrongShow: false, tookLead: false, climbed: false, dropped: false };

  it('matches the tone to how the round went', () => {
    expect(milestoneTagline({ ...quiet, wrongShow: true, wonRound: true })).toMatch(/Not the ideal way/);
    expect(milestoneTagline({ ...quiet, tookLead: true })).toMatch(/Took the lead/);
    expect(milestoneTagline({ ...quiet, wonRound: true })).toBe('What a way to get there!');
    expect(milestoneTagline({ ...quiet, dropped: true })).toMatch(/Keep pushing/);
    expect(milestoneTagline(quiet)).toMatch(/Keep it rolling/);
  });
});

describe('roundContextFor', () => {
  const roster = ['h', 'v'].map((userId) => ({ userId, userName: userId, status: 'active' as const, dnfAfterRound: null }));
  const rounds = [
    { round: 1, scores: [{ playerId: 'h', value: 20 }, { playerId: 'v', value: 5 }] },
    { round: 2, scores: [{ playerId: 'h', value: 0 }, { playerId: 'v', value: 30 }] },
  ];

  it('reads the latest round for a lowest-first game', () => {
    expect(roundContextFor('h', rounds, roster, 'lowest-first', [])).toEqual({
      wonRound: true,
      wrongShow: false,
      tookLead: true,
      climbed: true,
      dropped: false,
    });
    expect(roundContextFor('v', rounds, roster, 'lowest-first', [])).toMatchObject({ dropped: true, wonRound: false });
  });

  it('builds the moment for the latest round straight from the round history', () => {
    const moment = momentFromRounds(rounds, roster, 'lowest-first', [])!;
    expect(moment.climbers.map((c) => c.playerId)).toEqual(['h']);
    expect(moment.fallers.map((f) => f.playerId)).toEqual(['v']);
    expect(momentFromRounds(rounds.slice(0, 1), roster, 'lowest-first', [])).toBeNull();
    expect(latestRoundNumber(rounds)).toBe(2);
  });

  it('notices a wrong show in the latest round', () => {
    const withWrongShow = [...rounds, { round: 3, scores: [{ playerId: 'h', value: 58, wrongShow: true }, { playerId: 'v', value: 8 }] }];
    expect(roundContextFor('h', withWrongShow, roster, 'lowest-first', []).wrongShow).toBe(true);
  });
});
