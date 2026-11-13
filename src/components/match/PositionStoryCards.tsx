'use client';

import type { LucideIcon } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import type { PlayersById } from '@/types';

export interface PositionStoryCard {
  key: string;
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  playerId: string;
  playerName: string;
  detail: string;
}

interface PositionStoryCardsProps {
  cards: PositionStoryCard[];
  playersById: PlayersById;
  focusedId: string | null;
  onFocus: (playerId: string) => void;
}

export default function PositionStoryCards({
  cards,
  playersById,
  focusedId,
  onFocus,
}: PositionStoryCardsProps) {
  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {cards.map(({ key, icon: Icon, iconClassName, label, playerId, playerName, detail }) => {
        const isFocused = focusedId === playerId;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onFocus(playerId)}
            aria-pressed={isFocused}
            className={`text-left p-3 rounded-lg border transition ${
              isFocused
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400">
              <Icon className={`w-3.5 h-3.5 ${iconClassName}`} />
              {label}
            </div>
            <div className="mt-2 flex items-center gap-2 min-w-0">
              <Avatar
                name={playerName}
                profilePicUrl={playersById[playerId]?.profilePicUrl}
                size={28}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {playerName}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{detail}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
