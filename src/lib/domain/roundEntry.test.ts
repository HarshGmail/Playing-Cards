import { describe, expect, it } from 'vitest';
import {
  allScoresEntered,
  emptyScoreDrafts,
  enterKeyAction,
  enterKeyHintFor,
  sanitizeScoreInput,
  toSubmittedScores,
} from './roundEntry';

describe('emptyScoreDrafts', () => {
  it('gives every player a blank draft', () => {
    expect(emptyScoreDrafts(['a', 'b'])).toEqual({ a: '', b: '' });
  });
});

describe('sanitizeScoreInput', () => {
  it('keeps plain digits', () => {
    expect(sanitizeScoreInput('42')).toBe('42');
  });

  it('strips non-digits, including a minus sign', () => {
    expect(sanitizeScoreInput('-7a')).toBe('7');
    expect(sanitizeScoreInput('abc')).toBe('');
  });

  it('drops leading zeros but keeps a single zero', () => {
    expect(sanitizeScoreInput('007')).toBe('7');
    expect(sanitizeScoreInput('0')).toBe('0');
  });

  it('caps at the maximum score', () => {
    expect(sanitizeScoreInput('123456')).toBe('99999');
  });

  it('leaves an empty field empty', () => {
    expect(sanitizeScoreInput('')).toBe('');
  });
});

describe('allScoresEntered', () => {
  it('treats zero as an entered score', () => {
    expect(allScoresEntered(['a', 'b'], { a: '0', b: '12' })).toBe(true);
  });

  it('fails when any draft is blank or missing', () => {
    expect(allScoresEntered(['a', 'b'], { a: '5', b: '' })).toBe(false);
    expect(allScoresEntered(['a', 'b'], { a: '5' })).toBe(false);
  });
});

describe('enterKeyAction', () => {
  it('moves to the next field before the last one, valid or not', () => {
    expect(enterKeyAction(0, 3, false)).toBe('focus-next');
    expect(enterKeyAction(1, 3, true)).toBe('focus-next');
  });

  it('submits from the last field only when valid', () => {
    expect(enterKeyAction(2, 3, true)).toBe('submit');
    expect(enterKeyAction(2, 3, false)).toBe('none');
  });

  it('submits straight away when there is a single field', () => {
    expect(enterKeyAction(0, 1, true)).toBe('submit');
  });
});

describe('enterKeyHintFor', () => {
  it('says next until the last field, then done', () => {
    expect(enterKeyHintFor(0, 3)).toBe('next');
    expect(enterKeyHintFor(1, 3)).toBe('next');
    expect(enterKeyHintFor(2, 3)).toBe('done');
  });
});

describe('toSubmittedScores', () => {
  it('parses drafts in player order', () => {
    expect(toSubmittedScores(['b', 'a'], { a: '3', b: '0' })).toEqual([
      { playerId: 'b', value: 0 },
      { playerId: 'a', value: 3 },
    ]);
  });
});
