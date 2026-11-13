'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useReducedMotion } from 'framer-motion';
import { Activity, Crown, Play, Rocket, TrendingDown } from 'lucide-react';
import PositionStoryCards, { type PositionStoryCard } from '@/components/match/PositionStoryCards';
import { ordinal } from '@/lib/domain/milestones';
import { buildPositionHistory, type PositionRosterEntry } from '@/lib/domain/positionHistory';
import { buildPositionStory, describeRace, type PositionStory } from '@/lib/domain/positionStory';
import { buildPositionChartOptions } from './positionChartOptions';
import { useRaceAnimation } from './useRaceAnimation';
import type { PlayersById } from '@/types';

interface PositionTrendChartProps {
  rounds: Array<{ round: number; scores: Array<{ playerId: string; value: number }> }>;
  roster: PositionRosterEntry[];
  rankPreference: 'highest-first' | 'lowest-first';
  tiebreakers: string[];
  playersById: PlayersById;
  ended: boolean;
}

const MIN_ROLLERCOASTER_CHANGES = 3;

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildStoryCards(
  story: PositionStory,
  roundCount: number,
  nameOf: (playerId: string) => string
): PositionStoryCard[] {
  const cards: PositionStoryCard[] = [];
  const { mostRoundsLed, biggestClimb, biggestDrop, mostPositionChanges } = story;

  if (mostRoundsLed) {
    cards.push({
      key: 'most-rounds-led',
      icon: Crown,
      iconClassName: 'text-purple-500',
      label: 'Most rounds on top',
      playerId: mostRoundsLed.playerId,
      playerName: nameOf(mostRoundsLed.playerId),
      detail: `${mostRoundsLed.count} of ${pluralize(roundCount, 'round')}`,
    });
  }
  if (biggestClimb) {
    cards.push({
      key: 'biggest-climb',
      icon: Rocket,
      iconClassName: 'text-green-500',
      label: 'Biggest climb',
      playerId: biggestClimb.playerId,
      playerName: nameOf(biggestClimb.playerId),
      detail: `${ordinal(biggestClimb.from)} → ${ordinal(biggestClimb.to)} in R${biggestClimb.round}`,
    });
  }
  if (biggestDrop) {
    cards.push({
      key: 'biggest-drop',
      icon: TrendingDown,
      iconClassName: 'text-red-500',
      label: 'Biggest drop',
      playerId: biggestDrop.playerId,
      playerName: nameOf(biggestDrop.playerId),
      detail: `${ordinal(biggestDrop.from)} → ${ordinal(biggestDrop.to)} in R${biggestDrop.round}`,
    });
  }
  if (mostPositionChanges && mostPositionChanges.count >= MIN_ROLLERCOASTER_CHANGES) {
    cards.push({
      key: 'rollercoaster',
      icon: Activity,
      iconClassName: 'text-blue-500',
      label: 'Rollercoaster',
      playerId: mostPositionChanges.playerId,
      playerName: nameOf(mostPositionChanges.playerId),
      detail: `changed places ${pluralize(mostPositionChanges.count, 'time')}`,
    });
  }

  return cards;
}

export default function PositionTrendChart({
  rounds,
  roster,
  rankPreference,
  tiebreakers,
  playersById,
  ended,
}: PositionTrendChartProps) {
  const reduceMotion = useReducedMotion();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [replayCount, setReplayCount] = useState(0);

  const history = useMemo(
    () => buildPositionHistory(rounds, roster, rankPreference, tiebreakers),
    [rounds, roster, rankPreference, tiebreakers]
  );
  const story = useMemo(() => buildPositionStory(history), [history]);
  const nameOf = useCallback(
    (playerId: string) =>
      roster.find((player) => player.userId === playerId)?.userName ?? 'Unknown',
    [roster]
  );
  const toggleFocus = useCallback(
    (playerId: string) => setFocusedId((current) => (current === playerId ? null : playerId)),
    []
  );
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const frame = useRaceAnimation({
    history,
    roster,
    chartRef,
    animate: !reduceMotion,
    replayCount,
  });

  if (history.length === 0 || roster.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">No rounds played yet</p>
      </div>
    );
  }

  const headline = describeRace(story, {
    nameOf,
    ended,
    firstRound: history[0].round,
    lastRound: history[history.length - 1].round,
  });
  const cards = buildStoryCards(story, history.length, nameOf);
  const options = buildPositionChartOptions({
    history,
    story,
    roster,
    playersById,
    focusedId,
    frame,
    onToggleFocus: toggleFocus,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          {headline && (
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{headline}</p>
          )}
          {history.length > 1 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              <Crown className="w-3 h-3" />
              {pluralize(story.leadChanges, 'lead change')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!reduceMotion && (
            <button
              type="button"
              onClick={() => setReplayCount((count) => count + 1)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
            >
              <Play className="w-3 h-3" />
              Replay
            </button>
          )}
        </div>
      </div>

      <HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} />

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        {focusedId
          ? `Following ${nameOf(focusedId)}. Tap again to see everyone.`
          : 'Tap a line to follow that player. Hover a round for the standings.'}
      </p>

      <PositionStoryCards
        cards={cards}
        playersById={playersById}
        focusedId={focusedId}
        onFocus={toggleFocus}
      />
    </div>
  );
}
