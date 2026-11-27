import type Highcharts from 'highcharts';
import { claimHeadSlot, type RaceFrame, type RaceHead } from './raceFrame';

export type RankPreference = 'highest-first' | 'lowest-first';

export type CumulativeTotalsByPlayer = Map<string, number[]>;

export function cumulativeTotals(
  rows: Array<{ playerId: string; cells: Array<number | null> }>
): CumulativeTotalsByPlayer {
  return new Map(
    rows.map((row) => {
      let running = 0;
      const totals = row.cells.map((cell) => {
        if (cell !== null) running += cell;
        return running;
      });
      return [row.playerId, totals];
    })
  );
}

export function scoreRaceFinish(roundCount: number): number {
  return Math.max(0, roundCount - 1);
}

function roundCountOf(totals: CumulativeTotalsByPlayer): number {
  return Math.max(0, ...Array.from(totals.values()).map((values) => values.length));
}

export function buildScoreRaceFrame(totals: CumulativeTotalsByPlayer, progress: number): RaceFrame {
  const dataByPlayer = new Map<string, Highcharts.PointOptionsObject[]>();
  const heads = new Map<string, RaceHead>();
  const roundCount = roundCountOf(totals);
  if (roundCount === 0) return { dataByPlayer, heads };

  const clamped = Math.min(Math.max(progress, 0), scoreRaceFinish(roundCount));
  const settledIndex = Math.floor(clamped);
  const fraction = clamped - settledIndex;
  const claimedSpots = new Map<string, number>();

  totals.forEach((values, playerId) => {
    const points: Highcharts.PointOptionsObject[] = [];
    for (let index = 0; index <= settledIndex; index++) {
      points.push({ x: index, y: values[index] });
    }

    const from = values[settledIndex];
    const to = values[settledIndex + 1];
    if (fraction > 0 && to !== undefined) {
      points.push({ x: clamped, y: from + (to - from) * fraction });
    }

    const head = points[points.length - 1];
    if (head && typeof head.x === 'number') {
      head.marker = { enabled: false };
      heads.set(playerId, {
        x: head.x,
        staggerPx: claimHeadSlot(claimedSpots, head.x, Number(head.y)),
      });
    }
    dataByPlayer.set(playerId, points);
  });

  return { dataByPlayer, heads };
}

function bestValue(values: number[], rankPreference: RankPreference): number {
  return rankPreference === 'highest-first' ? Math.max(...values) : Math.min(...values);
}

export function leadersByRound(
  totals: CumulativeTotalsByPlayer,
  rankPreference: RankPreference
): Map<number, Set<string>> {
  const leaders = new Map<number, Set<string>>();
  const roundCount = roundCountOf(totals);
  let previous = new Set<string>();

  for (let index = 0; index < roundCount; index++) {
    const atRound = Array.from(totals.entries()).map(([playerId, values]) => ({
      playerId,
      value: values[index],
    }));
    const best = bestValue(atRound.map((entry) => entry.value), rankPreference);
    const current = new Set(atRound.filter((entry) => entry.value === best).map((entry) => entry.playerId));
    const isSharedLead = current.size === totals.size;
    const leading = isSharedLead ? new Set<string>() : current;
    const newLeaders = new Set(Array.from(leading).filter((playerId) => !previous.has(playerId)));
    if (newLeaders.size > 0) leaders.set(index, newLeaders);
    previous = leading;
  }

  return leaders;
}
