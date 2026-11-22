'use client';

import { useMemo, type ReactNode } from 'react';
import { LayoutGroup, MotionConfig } from 'framer-motion';
import { Plus } from 'lucide-react';
import LeaderboardPodium from '@/components/match/LeaderboardPodium';
import LiveChartPanel from '@/components/match/LiveChartPanel';
import StandingsTable from '@/components/match/StandingsTable';
import WinChancePanel from '@/components/match/WinChancePanel';
import { useRankTransition } from '@/components/match/useRankTransition';
import { gameRunsByPlayer } from '@/lib/domain/streaks';
import { useIsInView } from '@/lib/hooks/useIsInView';
import type { PlayersById, RosterEntry, WinForecast } from '@/types';

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
  roundEntry?: ReactNode;
  fullscreen?: boolean;
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

const ROUND_ENTRY_SCROLL_DELAY_MS = 350;

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
  roundEntry = null,
  fullscreen = false,
}: LeaderboardSectionProps) {
  const { entries, changes } = useRankTransition(matchId, latestEntries);
  const { ref: roundEntryRef, inView: roundEntryInView } = useIsInView<HTMLDivElement>();

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

  const scrollToRoundEntry = () => {
    const container = roundEntryRef.current;
    if (!container) return;
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(
      () => container.querySelector('input')?.focus({ preventScroll: true }),
      ROUND_ENTRY_SCROLL_DELAY_MS
    );
  };

  const sidebarPosition = fullscreen
    ? 'lg:top-4 lg:max-h-[calc(100vh-2rem)]'
    : 'lg:top-20 lg:max-h-[calc(100vh-6rem)]';

  return (
    <div className="space-y-4">
      {ended && (
        <MotionConfig reducedMotion="user">
          <LayoutGroup id={`podium-${matchId}`}>
            <LeaderboardPodium
              entries={podium}
              playersById={playersById}
              changes={changes}
              gameStreaks={gameStreaks}
              ended
            />
          </LayoutGroup>
        </MotionConfig>
      )}

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div
          className={`space-y-4 lg:col-span-5 xl:col-span-4 lg:sticky lg:overflow-y-auto lg:pr-1 ${sidebarPosition}`}
        >
          <MotionConfig reducedMotion="user">
            <LayoutGroup id={`standings-${matchId}`}>
              <StandingsTable
                entries={entries}
                playersById={playersById}
                changes={changes}
                gameStreaks={gameStreaks}
                winChanceById={winChanceById}
                large={fullscreen}
              />
            </LayoutGroup>
          </MotionConfig>
          {roundEntry && <div ref={roundEntryRef}>{roundEntry}</div>}
        </div>

        <div className="space-y-4 min-w-0 lg:col-span-7 xl:col-span-8">
          <LiveChartPanel
            entries={entries}
            rounds={rounds}
            players={players}
            playersById={playersById}
            rankPreference={rankPreference}
            tiebreakers={tiebreakers}
            ended={ended}
            fullscreen={fullscreen}
          />
          {showForecast && (
            <WinChancePanel forecast={forecast!} playersById={playersById} nameById={nameById} />
          )}
        </div>
      </div>

      {(bestRound || mostConsistent) && (
        <div className="grid md:grid-cols-2 gap-4">
          {mostConsistent && (
            <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
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
            <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
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

      {roundEntry && !roundEntryInView && (
        <button
          type="button"
          onClick={scrollToRoundEntry}
          className="lg:hidden fixed right-4 z-30 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg transition bottom-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <Plus className="w-5 h-5" />
          Add round
        </button>
      )}
    </div>
  );
}
