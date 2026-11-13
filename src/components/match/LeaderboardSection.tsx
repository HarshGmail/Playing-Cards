'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { LayoutGroup, MotionConfig } from 'framer-motion';
import { Table, BarChart3 } from 'lucide-react';
import Leaderboard from '@/components/match/Leaderboard';
import LeaderboardPodium from '@/components/match/LeaderboardPodium';
import RoundsWonTable from '@/components/match/RoundsWonTable';
import WinChancePanel from '@/components/match/WinChancePanel';
import { useRankTransition } from '@/components/match/useRankTransition';
import { buildScoreboardRows } from '@/lib/domain/scoreboard';
import { gameRunsByPlayer } from '@/lib/domain/streaks';
import type { PlayersById, RosterEntry, WinForecast } from '@/types';

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

const TREND_MODES = [
  { value: 'scores', label: 'Scores' },
  { value: 'positions', label: 'Positions' },
] as const;

type TrendMode = (typeof TREND_MODES)[number]['value'];

const TREND_TITLES: Record<TrendMode, string> = {
  scores: 'Score Trend',
  positions: 'Position Race',
};

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
  matchId: string;
  entries: LeaderboardEntry[];
  rounds: Array<{ round: number; scores: Array<{ playerId: string; value: number }> }>;
  players: RosterEntry[];
  /** Faces and handles keyed by userId, which is what `playerId` holds. */
  playersById: PlayersById;
  rankPreference: 'highest-first' | 'lowest-first';
  tiebreakers: string[];
  ended?: boolean;
  forecast?: WinForecast | null;
}

function findBestSingleRound(
  rounds: LeaderboardSectionProps['rounds'],
  players: LeaderboardSectionProps['players'],
  rankPreference: 'highest-first' | 'lowest-first'
) {
  const nameById = new Map(players.map((p) => [p.userId, p.userName]));

  if (rankPreference === 'highest-first') {
    let best: { playerId: string; round: number; value: number } | null = null;
    for (const round of rounds) {
      for (const score of round.scores) {
        if (!best || score.value > best.value) {
          best = { playerId: score.playerId, round: round.round, value: score.value };
        }
      }
    }
    if (!best) return null;
    return { ...best, margin: null as number | null, name: nameById.get(best.playerId) ?? 'Unknown' };
  }

  // Lowest-first: raw round values trend upward over the match (each round's
  // penalty score is typically >= the last), so the lowest raw value is
  // almost always round 1 and tells you nothing about a standout round.
  // Instead, find the round where the winner beat the runner-up by the
  // widest margin — a blowout can happen at any point in the match.
  let best: { playerId: string; round: number; value: number; margin: number } | null = null;
  for (const round of rounds) {
    if (round.scores.length < 2) continue;
    const sorted = [...round.scores].sort((a, b) => a.value - b.value);
    const [winner, runnerUp] = sorted;
    const margin = runnerUp.value - winner.value;
    if (!best || margin > best.margin) {
      best = { playerId: winner.playerId, round: round.round, value: winner.value, margin };
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
  matchId,
  entries: latestEntries,
  rounds,
  players,
  playersById,
  rankPreference,
  tiebreakers,
  ended = false,
  forecast = null,
}: LeaderboardSectionProps) {
  const [view, setView] = useState<'table' | 'chart'>('table');
  const [trendMode, setTrendMode] = useState<TrendMode>('scores');
  const { entries, changes } = useRankTransition(matchId, latestEntries);

  const gameStreaks = useMemo(
    () =>
      new Map(
        Array.from(gameRunsByPlayer(rounds, rankPreference), ([playerId, { current }]) => [
          playerId,
          current,
        ])
      ),
    [rounds, rankPreference]
  );

  const bestRound = findBestSingleRound(rounds, players, rankPreference);
  const mostConsistent = findMostConsistent(entries);
  // DNF players are excluded, matching how the leaderboard rows order them last.
  const podium = entries.filter((e) => !e.isDnf).slice(0, 3);
  const nameById = useMemo(() => new Map(players.map((p) => [p.userId, p.userName])), [players]);
  const showForecast = !!forecast && !ended;
  const winChanceById = useMemo(
    () =>
      showForecast
        ? new Map(forecast!.players.map((p) => [p.playerId, p.winProbability]))
        : undefined,
    [forecast, showForecast]
  );

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
        <div className="space-y-6">
          {/* Spans both tables: the top three summarise the match rather than
              belonging to the leaderboard column. */}
          <MotionConfig reducedMotion="user">
            <LayoutGroup id={`leaderboard-${matchId}`}>
              <LeaderboardPodium
                entries={podium}
                playersById={playersById}
                changes={changes}
                gameStreaks={gameStreaks}
                ended={ended}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <Leaderboard
                  entries={entries}
                  playersById={playersById}
                  changes={changes}
                  gameStreaks={gameStreaks}
                  winChanceById={winChanceById}
                  compact
                />
                <RoundsWonTable entries={entries} playersById={playersById} />
              </div>
            </LayoutGroup>
          </MotionConfig>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Totals</h3>
              <TotalsChart entries={entries} playersById={playersById} />
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
                Rounds Won
              </h3>
              <RoundsWonChart entries={entries} playersById={playersById} />
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {TREND_TITLES[trendMode]}
              </h3>
              <div className="flex items-center gap-1">
                {TREND_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setTrendMode(mode.value)}
                    aria-pressed={trendMode === mode.value}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition ${
                      trendMode === mode.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            {trendMode === 'scores' ? (
              <ScoreTrendChart rounds={rounds} players={players} playersById={playersById} />
            ) : (
              <PositionTrendChart
                rounds={rounds}
                roster={players}
                rankPreference={rankPreference}
                tiebreakers={tiebreakers}
                playersById={playersById}
                ended={ended}
              />
            )}
          </div>
        </div>
      )}

      {showForecast && (
        <WinChancePanel forecast={forecast!} playersById={playersById} nameById={nameById} />
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
                {rankPreference === 'highest-first'
                  ? `${bestRound.value} in round ${bestRound.round}`
                  : `won round ${bestRound.round} by ${bestRound.margin} pts`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
