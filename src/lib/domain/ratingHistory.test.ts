import { describe, it, expect } from 'vitest';
import { START_RATING } from './rating';
import { formatRatingDelta, ratingWindow, TimedRating } from './ratingHistory';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 30);

function point(daysAgo: number, rating: number, delta = 0): TimedRating {
  return { time: NOW - daysAgo * DAY, rating, delta, matchName: `m-${daysAgo}` };
}

const history = [point(40, 1210), point(20, 1230), point(10, 1220), point(3, 1250)];

describe('ratingWindow', () => {
  it('measures change from the last rating before the range', () => {
    const window = ratingWindow(history, '15d', NOW);
    expect(window.startRating).toBe(1230);
    expect(window.endRating).toBe(1250);
    expect(window.change).toBe(20);
    expect(window.matchesInRange).toBe(2);
  });

  it('anchors the line at the range start and extends it to now', () => {
    const { points } = ratingWindow(history, '7d', NOW);
    expect(points[0]).toEqual({ time: NOW - 7 * DAY, rating: 1220, match: null });
    expect(points[points.length - 1]).toEqual({ time: NOW, rating: 1250, match: null });
    expect(points.filter((p) => p.match).map((p) => p.rating)).toEqual([1250]);
  });

  it('measures all-time change from the starting rating', () => {
    const window = ratingWindow(history, 'all', NOW);
    expect(window.startRating).toBe(START_RATING);
    expect(window.change).toBe(50);
    expect(window.points[0].match?.matchName).toBe('m-40');
  });

  it('shows a flat line with no change when nothing was played in the range', () => {
    const window = ratingWindow([point(20, 1230)], '7d', NOW);
    expect(window.change).toBe(0);
    expect(window.matchesInRange).toBe(0);
    expect(window.points.map((p) => p.rating)).toEqual([1230, 1230]);
  });

  it('is empty for a player with no rated matches', () => {
    const window = ratingWindow([], '30d', NOW);
    expect(window.points).toEqual([]);
    expect(window.endRating).toBe(START_RATING);
    expect(window.change).toBe(0);
  });

  it('accepts history in any order', () => {
    const shuffled = [history[2], history[0], history[3], history[1]];
    expect(ratingWindow(shuffled, '15d', NOW)).toEqual(ratingWindow(history, '15d', NOW));
  });
});

describe('formatRatingDelta', () => {
  it('signs gains and leaves losses and zero alone', () => {
    expect(formatRatingDelta(12)).toBe('+12');
    expect(formatRatingDelta(-4)).toBe('-4');
    expect(formatRatingDelta(0)).toBe('0');
  });
});
