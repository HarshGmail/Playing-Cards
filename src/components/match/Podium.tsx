'use client';

import { Trophy, Medal } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import type { PlayersById } from '@/types';

interface PodiumEntry {
  playerId: string;
  position: number;
  name: string;
  total: number;
  isSharedPosition: boolean;
}

interface PodiumProps {
  entries: PodiumEntry[];
  playersById: PlayersById;
}

const BLOCK_STYLES: Record<number, { order: string; height: string; block: string; icon: JSX.Element }> = {
  1: {
    order: 'order-2',
    height: 'h-40',
    block: 'bg-gradient-to-b from-purple-500 to-purple-700 text-white',
    icon: <Trophy className="w-7 h-7 text-yellow-500" />,
  },
  2: {
    order: 'order-1',
    height: 'h-28',
    block: 'bg-gradient-to-b from-green-500 to-green-700 text-white',
    icon: <Medal className="w-6 h-6 text-gray-400" />,
  },
  3: {
    order: 'order-3',
    height: 'h-20',
    block: 'bg-gradient-to-b from-yellow-500 to-yellow-700 text-white',
    icon: <Medal className="w-6 h-6 text-yellow-700" />,
  },
};

export default function Podium({ entries, playersById }: PodiumProps) {
  return (
    <div className="flex items-end justify-center gap-3 py-4">
      {entries.map((entry) => {
        const style = BLOCK_STYLES[entry.position];
        if (!style) return null;
        return (
          <div key={entry.playerId} className={`flex flex-col items-center w-28 ${style.order}`}>
            {style.icon}
            <Avatar
              name={entry.name}
              profilePicUrl={playersById[entry.playerId]?.profilePicUrl}
              size={40}
              className="mt-1"
            />
            <p className="font-semibold text-gray-900 dark:text-white text-center truncate w-full mt-1">
              {entry.name}
              {entry.isSharedPosition && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(tied)</span>
              )}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{entry.total}</p>
            <div
              className={`w-full ${style.height} ${style.block} rounded-t-lg flex items-start justify-center pt-2 text-2xl font-bold shadow-inner`}
            >
              {entry.position}
            </div>
          </div>
        );
      })}
    </div>
  );
}
