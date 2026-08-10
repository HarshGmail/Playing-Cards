'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GAMES, GAME_TYPES, type GameType } from '@/lib/games/catalog';

interface Step1Props {
  onNext: (data: {
    name: string;
    creatorRole: string;
    rankPreference: string;
    gameType: GameType;
    gameLabel?: string;
  }) => void;
}

export default function CreateMatchStep1({ onNext }: Step1Props) {
  const [name, setName] = useState('');
  const [creatorRole, setCreatorRole] = useState('score-only');
  const [gameType, setGameType] = useState<GameType>('least-count');
  const [gameLabel, setGameLabel] = useState('');
  const [rankPreference, setRankPreference] = useState<string>(
    GAMES['least-count'].defaultRankPreference
  );
  const [error, setError] = useState('');

  const selectedGame = GAMES[gameType];

  // Picking a game prefills the ranking direction it is normally played with —
  // Least Count is always lowest-wins — but leaves the field editable.
  const handleGameChange = (next: GameType) => {
    setGameType(next);
    setRankPreference(GAMES[next].defaultRankPreference);
  };

  const handleNext = () => {
    if (!name.trim()) {
      setError('Match name is required');
      return;
    }
    if (name.length < 3 || name.length > 50) {
      setError('Match name must be 3-50 characters');
      return;
    }
    if (gameType === 'other' && !gameLabel.trim()) {
      setError('Name the game you are playing');
      return;
    }
    onNext({
      name,
      creatorRole,
      rankPreference,
      gameType,
      gameLabel: gameType === 'other' ? gameLabel.trim() : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Match Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleNext()}
          placeholder="e.g., Poker Night 2024"
          maxLength={50}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Game
        </label>
        <select
          value={gameType}
          onChange={(e) => handleGameChange(e.target.value as GameType)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
        >
          {GAME_TYPES.map((type) => (
            <option key={type} value={type}>
              {GAMES[type].label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {selectedGame.blurb}
          {selectedGame.rulesPath && (
            <>
              {' '}
              <Link
                href={selectedGame.rulesPath}
                target="_blank"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Read the rules
              </Link>
            </>
          )}
        </p>
      </div>

      {gameType === 'other' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Which game?
          </label>
          <input
            type="text"
            value={gameLabel}
            onChange={(e) => setGameLabel(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleNext()}
            placeholder="e.g., Bluff, Rummy, Teen Patti"
            maxLength={50}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Your Role
        </label>
        <select
          value={creatorRole}
          onChange={(e) => setCreatorRole(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
        >
          <option value="score-only">Score keeper (not playing)</option>
          <option value="score-and-play">Score keeper &amp; player</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Ranking Preference
        </label>
        <select
          value={rankPreference}
          onChange={(e) => setRankPreference(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
        >
          <option value="highest-first">Highest score wins</option>
          <option value="lowest-first">Lowest score wins</option>
        </select>
      </div>

      <button
        onClick={handleNext}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
      >
        Next: Tiebreakers
      </button>
    </div>
  );
}
