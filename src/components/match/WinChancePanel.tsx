'use client';

import Link from 'next/link';
import { HelpCircle, Sparkles } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import type { PlayersById, WinForecast } from '@/types';

interface WinChancePanelProps {
  forecast: WinForecast;
  playersById: PlayersById;
  nameById: Map<string, string>;
}

const PERCENT = 100;
export const WIN_CHANCES_EXPLAINER_PATH = '/rules/win-chances';
const LOW_CHANCE_THRESHOLD = 0.01;
const CERTAIN_THRESHOLD = 0.995;

export function formatWinChance(probability: number): string {
  if (probability >= CERTAIN_THRESHOLD) return '>99%';
  if (probability > 0 && probability < LOW_CHANCE_THRESHOLD) return '<1%';
  return `${Math.round(probability * PERCENT)}%`;
}

function progressLabel({ gamesPlayed, targetGames, remainingGames }: WinForecast): string {
  const gamesWord = remainingGames === 1 ? 'game' : 'games';
  return `${gamesPlayed} of ${targetGames} games played · ${remainingGames} ${gamesWord} left`;
}

export default function WinChancePanel({ forecast, playersById, nameById }: WinChancePanelProps) {
  return (
    <section
      aria-labelledby="win-chance-title"
      className="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3
          id="win-chance-title"
          className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"
        >
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          Win chances
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{progressLabel(forecast)}</p>
      </div>

      <ul className="space-y-2">
        {forecast.players.map((player) => {
          const name = nameById.get(player.playerId) ?? 'Unknown';
          const identity = playersById[player.playerId];
          const widthPercent = player.winProbability * PERCENT;
          return (
            <li key={player.playerId} className="flex items-center gap-3">
              <Avatar name={name} profilePicUrl={identity?.profilePicUrl} size={24} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {name}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                    {formatWinChance(player.winProbability)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-[width] duration-500 dark:bg-blue-500"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Simulates the remaining games thousands of times from each player&apos;s past scores in this
        game, counting today&apos;s games extra.{' '}
        <Link
          href={WIN_CHANCES_EXPLAINER_PATH}
          target="_blank"
          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          How it works
        </Link>
      </p>
    </section>
  );
}
