'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import type { PlayersById } from '@/types';

interface SubmittedRoundsProps {
  rounds: Array<{
    round: number;
    scores: Array<{
      playerId: string;
      value: number;
      enteredBy: string;
      enteredAt: string;
    }>;
  }>;
  playerNames: Record<string, string>;
  playersById: PlayersById;
  isCreator: boolean;
  onEdit?: (round: number) => void;
}

export default function SubmittedRounds({
  rounds,
  playerNames,
  playersById,
  isCreator,
  onEdit,
}: SubmittedRoundsProps) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  if (rounds.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">No rounds submitted yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rounds.map((round) => (
        <div
          key={round.round}
          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
        >
          <button
            onClick={() =>
              setExpandedRound(expandedRound === round.round ? null : round.round)
            }
            className="w-full p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <div className="text-left">
              <p className="font-semibold text-gray-900 dark:text-white">Round {round.round}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {round.scores.length} scores
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isCreator && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(round.round);
                  }}
                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                >
                  Edit
                </button>
              )}
              <ChevronDown
                className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition ${
                  expandedRound === round.round ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {expandedRound === round.round && (
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-2">
              {round.scores.map((score, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Avatar
                      name={playerNames[score.playerId] || 'Unknown'}
                      profilePicUrl={playersById[score.playerId]?.profilePicUrl}
                      size={24}
                    />
                    {playerNames[score.playerId] || 'Unknown'}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">{score.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
