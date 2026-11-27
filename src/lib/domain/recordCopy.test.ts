import { describe, it, expect } from 'vitest';
import { describeChance, describeRecordCard, describeRecordToBeat, recordGoal, recordSpent } from './recordCopy';

describe('describeRecordCard', () => {
  const base = {
    kind: 'matchWins' as const,
    threshold: 5,
    holder: { name: 'Harsh Vardhan', count: 17, isViewer: false, isSubject: false },
    subject: { name: 'You', isViewer: true },
    subjectReachedCount: null,
    subjectProgress: null,
  };
  const friend = { name: 'Vinay', isViewer: false };

  it('compares the viewer with the record holder once both got there', () => {
    expect(describeRecordCard({ ...base, subjectReachedCount: 21 })).toEqual({
      title: 'Fastest to 5 match wins',
      holderLine: 'Harsh Vardhan won in 17 matches.',
      subjectLine: 'You won 5 matches in 21 matches.',
      nudge: '4 matches slower than the record.',
    });
  });

  it('tells the holder the record is theirs', () => {
    const holder = { ...base.holder, isViewer: true, isSubject: true };
    const copy = describeRecordCard({ ...base, holder, subjectReachedCount: 17 });
    expect(copy.holderLine).toBe('You won in 17 matches.');
    expect(copy.subjectLine).toBe('This record is yours.');
  });

  it('shows progress and what it takes to beat the record', () => {
    const copy = describeRecordCard({ ...base, subjectProgress: { wins: 3, played: 12 } });
    expect(copy.subjectLine).toBe("You've won 3 of 12 matches so far.");
    expect(copy.nudge).toBe('2 wins in the next 4 matches takes the record.');
  });

  it('asks for consecutive wins when there is no room to spare', () => {
    const copy = describeRecordCard({ ...base, subjectProgress: { wins: 3, played: 14 } });
    expect(copy.nudge).toBe('Winning the next 2 matches takes the record.');
  });

  it('admits when the record can no longer be beaten', () => {
    const copy = describeRecordCard({ ...base, subjectProgress: { wins: 1, played: 15 } });
    expect(copy.nudge).toBe('The record is out of reach now, but 4 more wins still gets there.');
  });

  it('handles a viewer who has not played the format', () => {
    expect(describeRecordCard(base)).toMatchObject({ subjectLine: "You haven't played this yet.", nudge: null });
  });

  it("speaks about a friend on the friend's profile", () => {
    expect(describeRecordCard({ ...base, subject: friend, subjectReachedCount: 21 }).subjectLine).toBe(
      'Vinay won 5 matches in 21 matches.'
    );
    expect(describeRecordCard({ ...base, subject: friend, subjectProgress: { wins: 3, played: 12 } }).subjectLine).toBe(
      'Vinay has won 3 of 12 matches so far.'
    );
    expect(describeRecordCard({ ...base, subject: friend }).subjectLine).toBe("Vinay hasn't played this yet.");
    const holder = { name: 'Vinay', count: 17, isViewer: false, isSubject: true };
    expect(describeRecordCard({ ...base, holder, subject: friend }).subjectLine).toBe("This record is Vinay's.");
  });

  it('uses games for game-win records', () => {
    const copy = describeRecordCard({
      ...base,
      kind: 'gameWins',
      threshold: 50,
      holder: { name: 'BattingBot', count: 134, isViewer: false, isSubject: false },
      subjectReachedCount: 195,
    });
    expect(copy.holderLine).toBe('BattingBot won in 134 games.');
    expect(copy.subjectLine).toBe('You won 50 games in 195 games.');
  });
});

describe('record copy', () => {
  it('names the goal and the cost with singular and plural words', () => {
    expect(recordGoal('matchWins', 1)).toBe('1 match win');
    expect(recordGoal('gameWins', 100)).toBe('100 game wins');
    expect(recordSpent('matchWins', 9)).toBe('in 9 matches');
    expect(recordSpent('gameWins', 1)).toBe('in 1 game');
  });

  it('tells a player to win this match for a match-win record', () => {
    const chance = { kind: 'matchWins' as const, threshold: 5, winsNeeded: 1, withinGames: null, newCount: 7, record: { name: 'Harsh', count: 9 } };
    expect(describeChance(chance)).toBe('Win this match to hit 5 match wins in 7 matches');
    expect(describeRecordToBeat(chance)).toBe('Record: Harsh, in 9 matches');
  });

  it('gives the rounds budget for a game-win record', () => {
    const chance = { kind: 'gameWins' as const, threshold: 100, winsNeeded: 3, withinGames: 9, newCount: 293, record: { name: 'Vinay', count: 300 } };
    expect(describeChance(chance)).toBe('Win 3 of the next 9 rounds to hit 100 game wins in 293 games');
  });

  it('asks for consecutive wins when there is no slack', () => {
    const tight = { kind: 'gameWins' as const, threshold: 50, winsNeeded: 2, withinGames: 2, newCount: 120, record: { name: 'A', count: 121 } };
    expect(describeChance(tight)).toBe('Win the next 2 rounds to hit 50 game wins in 120 games');
    const single = { ...tight, winsNeeded: 1, withinGames: null, record: null };
    expect(describeChance(single)).toBe('Win the next round to hit 50 game wins in 120 games');
    expect(describeRecordToBeat(single)).toBe('No one has done it yet');
  });
});
