'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Table, BarChart3 } from 'lucide-react';
import Leaderboard from '@/components/match/Leaderboard';
import RoundsWonTable from '@/components/match/RoundsWonTable';
import { buildScoreboardRows } from '@/lib/domain/scoreboard';

const TotalsChart = dynamic(() => import('@/components/match/charts/TotalsChart'), { ssr: false });
const RoundsWonChart = dynamic(() => import('@/components/match/charts/RoundsWonChart'), {
  ssr: false,
});
const ScoreTrendChart = dynamic(() => import('@/components/match/charts/ScoreTrendChart'), {
  ssr: false,
});

interface LeaderboardEntry {
  position: number;
  playerId: string;
  name: string;
  total: number;
  average: number;
  stdDev: number;
  roundsPlayed: number;
  gapToLeader: number;
  gapToAhead: number | null;
  isDnf: boolean;
  isSharedPosition: boolean;
  isLast: boolean;
  gamesWon: number;
}

interface LeaderboardSectionProps {
  entries: LeaderboardEntry[];
  rounds: Array<{ round: number; scores: Array<{ playerId: string; value: number }> }>;
  players: Array<{ userId: string; userName: string }>;
  rankPreference: 'highest-first' | 'lowest-first';
}

function findBestSingleRound(
  rounds: LeaderboardSectionProps['rounds'],
  players: LeaderboardSectionProps['players'],
  rankPreference: 'highest-first' | 'lowest-first'
) {
  const nameById = new Map(players.map((p) => [p.userId, p.userName]));
  let best: { playerId: string; round: number; value: number } | null = null;

  for (const round of rounds) {
    for (const score of round.scores) {
      if (
        !best ||
        (rankPreference === 'highest-first' ? score.value > best.value : score.value < best.value)
      ) {
        best = { playerId: score.playerId, round: round.round, value: score.value };
      }
    }
  }

  if (!best) return null;
  return { ...best, name: nameById.get(best.playerId) ?? 'Unknown' };
}

function findMostConsistent(entries: LeaderboardEntry[]) {
  const eligible = entries.filter((e) => !e.isDnf && e.roundsPlayed > 1);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, e) => (e.stdDev < best.stdDev ? e : best), eligible[0]);
}

export default function LeaderboardSection({
  entries,
  rounds,
  players,
  rankPreference,
}: LeaderboardSectionProps) {
  const [view, setView] = useState<'table' | 'chart'>('table');

  const bestRound = findBestSingleRound(rounds, players, rankPreference);
  const mostConsistent = findMostConsistent(entries);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 justify-end">
        <button
          onClick={() => setView('table')}
          aria-label="Table view"
          className={`p-2 rounded-lg transition ${
            view === 'table'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Table className="w-4 h-4" />
        </button>
        <button
          onClick={() => setView('chart')}
          aria-label="Chart view"
          className={`p-2 rounded-lg transition ${
            view === 'chart'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
        </button>
      </div>

      {view === 'table' ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Leaderboard entries={entries} compact />
          <RoundsWonTable entries={entries} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Totals</h3>
              <TotalsChart entries={entries} />
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
                Rounds Won
              </h3>
              <RoundsWonChart entries={entries} />
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
              Score Trend
            </h3>
            <ScoreTrendChart rounds={rounds} players={players} />
          </div>
        </div>
      )}

      {(bestRound || mostConsistent) && (
        <div className="grid md:grid-cols-2 gap-4">
          {mostConsistent && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
                MOST CONSISTENT
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">{mostConsistent.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                std dev {mostConsistent.stdDev.toFixed(1)}
              </p>
            </div>
          )}
          {bestRound && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
                BEST SINGLE ROUND
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">{bestRound.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {bestRound.value} in round {bestRound.round}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
