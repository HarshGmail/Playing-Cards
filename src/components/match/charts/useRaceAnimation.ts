'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type HighchartsReact from 'highcharts-react-official';
import type { PositionRosterEntry, RoundPositions } from '@/lib/domain/positionHistory';
import { buildRaceFrame, finalRaceProgress, type RaceFrame } from './positionChartOptions';

const MS_PER_ROUND = 220;
const MAX_RACE_MS = 4500;
const MIN_STEP_MS = 600;

interface RaceAnimationArgs {
  history: RoundPositions[];
  roster: PositionRosterEntry[];
  chartRef: RefObject<HighchartsReact.RefObject>;
  animate: boolean;
  replayCount: number;
  layout: string;
}

function raceDurationMs(start: number, finish: number): number {
  const msPerRound = Math.min(MS_PER_ROUND, MAX_RACE_MS / Math.max(finish, 1));
  return Math.max(MIN_STEP_MS, (finish - start) * msPerRound);
}

export function useRaceAnimation({
  history,
  roster,
  chartRef,
  animate,
  replayCount,
  layout,
}: RaceAnimationArgs): RaceFrame {
  const finish = finalRaceProgress(history);
  const shownProgressRef = useRef<number | null>(null);
  const frameRef = useRef<RaceFrame | null>(null);
  const lastReplayRef = useRef(replayCount);

  if (shownProgressRef.current === null) shownProgressRef.current = animate ? 0 : finish;
  if (frameRef.current === null) {
    frameRef.current = buildRaceFrame(history, roster, shownProgressRef.current);
  }

  useEffect(() => {
    const chart = chartRef.current?.chart;
    const frame = frameRef.current;
    if (!chart || !frame) return;

    if (replayCount !== lastReplayRef.current) {
      lastReplayRef.current = replayCount;
      shownProgressRef.current = 0;
    }

    const draw = (progress: number) => {
      const next = buildRaceFrame(history, roster, progress);
      frame.dataByPlayer = next.dataByPlayer;
      frame.heads = next.heads;
      chart.series.forEach((series) =>
        series.setData(next.dataByPlayer.get(String(series.options.id)) ?? [], false, false)
      );
      chart.redraw(false);
      shownProgressRef.current = progress;
    };

    const start = Math.min(shownProgressRef.current ?? 0, finish);
    if (!animate || start >= finish) {
      draw(finish);
      return;
    }

    const duration = raceDurationMs(start, finish);
    const startedAt = performance.now();
    let frameId = requestAnimationFrame(function step(now) {
      const elapsed = Math.min(1, (now - startedAt) / duration);
      draw(start + (finish - start) * elapsed);
      if (elapsed < 1) frameId = requestAnimationFrame(step);
    });

    return () => cancelAnimationFrame(frameId);
  }, [chartRef, history, roster, animate, replayCount, layout, finish]);

  return frameRef.current;
}
