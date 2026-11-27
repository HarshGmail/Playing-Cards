'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { LeaderboardEntry, PlayersById, RosterEntry } from '@/types';

const TotalsChart = dynamic(() => import('@/components/match/charts/TotalsChart'), { ssr: false });
const RoundsWonChart = dynamic(() => import('@/components/match/charts/RoundsWonChart'), {
  ssr: false,
});
const ScoreTrendChart = dynamic(() => import('@/components/match/charts/ScoreTrendChart'), {
  ssr: false,
});
const PositionTrendChart = dynamic(() => import('@/components/match/charts/PositionTrendChart'), {
  ssr: false,
});

const CHART_MODES = [
  { value: 'positions', label: 'Positions', title: 'Position Race' },
  { value: 'scores', label: 'Scores', title: 'Score Trend' },
  { value: 'totals', label: 'Totals', title: 'Totals' },
  { value: 'rounds-won', label: 'Wins', title: 'Rounds Won' },
] as const;

type ChartMode = (typeof CHART_MODES)[number]['value'];

const FULLSCREEN_CHART_HEIGHT = 520;

interface LiveChartPanelProps {
  entries: LeaderboardEntry[];
  rounds: Array<{ round: number; scores: Array<{ playerId: string; value: number }> }>;
  players: RosterEntry[];
  playersById: PlayersById;
  rankPreference: 'highest-first' | 'lowest-first';
  tiebreakers: string[];
  ended: boolean;
  fullscreen: boolean;
}

export default function LiveChartPanel({
  entries,
  rounds,
  players,
  playersById,
  rankPreference,
  tiebreakers,
  ended,
  fullscreen,
}: LiveChartPanelProps) {
  const [mode, setMode] = useState<ChartMode>('positions');
  const height = fullscreen ? FULLSCREEN_CHART_HEIGHT : undefined;
  const activeMode = CHART_MODES.find((option) => option.value === mode)!;

  return (
    <section
      aria-label={activeMode.title}
      className="p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{activeMode.title}</h3>
        <div
          role="group"
          aria-label="Chart type"
          className="inline-flex p-0.5 rounded-lg bg-gray-100 dark:bg-gray-900/60"
        >
          {CHART_MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              aria-pressed={mode === option.value}
              className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition ${
                mode === option.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'positions' && (
        <PositionTrendChart
          rounds={rounds}
          roster={players}
          rankPreference={rankPreference}
          tiebreakers={tiebreakers}
          playersById={playersById}
          ended={ended}
          height={height}
        />
      )}
      {mode === 'scores' && (
        <ScoreTrendChart
          rounds={rounds}
          players={players}
          playersById={playersById}
          rankPreference={rankPreference}
          height={height}
        />
      )}
      {mode === 'totals' && (
        <TotalsChart entries={entries} playersById={playersById} height={height} />
      )}
      {mode === 'rounds-won' && (
        <RoundsWonChart entries={entries} playersById={playersById} height={height} />
      )}
    </section>
  );
}
