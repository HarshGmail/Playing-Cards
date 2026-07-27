'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Step3Props {
  name: string;
  creatorRole: string;
  rankPreference: string;
  playerIds: string[];
  onBack: () => void;
}

export default function CreateMatchStep3({
  name,
  creatorRole,
  rankPreference,
  playerIds,
  onBack,
}: Step3Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          creatorRole,
          rankPreference,
          players: playerIds,
          tiebreakers: ['Head to Head', 'Point Differential', 'Most Recent Round'],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create match');
      }

      const data = await res.json();
      router.push(`/matches/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create match');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Match Name</p>
          <p className="font-semibold text-gray-900 dark:text-white">{name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Your Role</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {creatorRole === 'score-only' ? 'Score Keeper Only' : 'Score Keeper & Player'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Ranking</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {rankPreference === 'highest-first' ? 'Highest Score Wins' : 'Lowest Score Wins'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Players</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {playerIds.length} {playerIds.length === 1 ? 'player' : 'players'}
          </p>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Match'}
        </button>
      </div>
    </div>
  );
}
