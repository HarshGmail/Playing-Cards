'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useReducedMotion } from 'framer-motion';
import { Play } from 'lucide-react';
import { buildScoreboardRows } from '@/lib/domain/scoreboard';
import { buildScoreChartOptions, DEFAULT_SCORE_CHART_HEIGHT } from './scoreChartOptions';
import {
  buildScoreRaceFrame,
  cumulativeTotals,
  leadersByRound,
  scoreRaceFinish,
  type RankPreference,
} from './scoreRaceFrame';
import { useRaceAnimation } from './useRaceAnimation';
import type { PlayersById } from '@/types';

interface ScoreTrendChartProps {
  rounds: Array<{ round: number; scores: Array<{ playerId: string; value: number }> }>;
  players: Array<{ userId: string; userName: string }>;
  playersById: PlayersById;
  rankPreference?: RankPreference;
  height?: number;
}

export default function ScoreTrendChart({
  rounds,
  players,
  playersById,
  rankPreference = 'highest-first',
  height = DEFAULT_SCORE_CHART_HEIGHT,
}: ScoreTrendChartProps) {
  const reduceMotion = useReducedMotion();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [replayCount, setReplayCount] = useState(0);

  const rows = useMemo(() => buildScoreboardRows(rounds, players), [rounds, players]);
  const totals = useMemo(() => cumulativeTotals(rows), [rows]);
  const leaders = useMemo(() => leadersByRound(totals, rankPreference), [totals, rankPreference]);
  const roundNumbers = useMemo(() => rounds.map((round) => round.round), [rounds]);
  const finish = scoreRaceFinish(rounds.length);

  const buildFrame = useCallback((progress: number) => buildScoreRaceFrame(totals, progress), [totals]);
  const toggleFocus = useCallback(
    (playerId: string) => setFocusedId((current) => (current === playerId ? null : playerId)),
    []
  );
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const frame = useRaceAnimation({
    chartRef,
    animate: !reduceMotion,
    replayCount,
    finish,
    buildFrame,
  });

  if (rounds.length === 0 || players.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">No rounds played yet</p>
      </div>
    );
  }

  const options = buildScoreChartOptions({
    rows,
    totals,
    leaders,
    roundNumbers,
    rankPreference,
    playersById,
    focusedId,
    frame,
    onToggleFocus: toggleFocus,
    height,
  });

  const nameOf = (playerId: string) => players.find((p) => p.userId === playerId)?.userName ?? 'Unknown';

  return (
    <div className="space-y-3">
      {!reduceMotion && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setReplayCount((count) => count + 1)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
          >
            <Play className="w-3 h-3" />
            Replay
          </button>
        </div>
      )}

      <HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} />

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        {focusedId
          ? `Following ${nameOf(focusedId)}. Tap again to see everyone.`
          : 'Tap a line to follow that player. Hover a round for the running totals.'}
      </p>
    </div>
  );
}
