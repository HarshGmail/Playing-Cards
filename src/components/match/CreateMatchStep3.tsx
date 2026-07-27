'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

interface Step3Props {
  name: string;
  creatorRole: string;
  rankPreference: string;
  tiebreakers: string[];
  onBack: () => void;
}

interface AddedPlayer {
  id: string;
  name: string;
  username: string;
}

export default function CreateMatchStep3({
  name,
  creatorRole,
  rankPreference,
  tiebreakers,
  onBack,
}: Step3Props) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [players, setPlayers] = useState<AddedPlayer[]>([]);
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [createError, setCreateError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddPlayer = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) return;

    setAddError('');
    setAdding(true);
    try {
      const res = await fetch('/api/users/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmed }),
      });

      if (res.status === 404) {
        setAddError('No user found with that username, email, or phone.');
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to look up user');
      }

      const data = await res.json();
      const found = data.user;

      if (found.id === user?.id) {
        setAddError("That's you — you're already in the match.");
        return;
      }
      if (players.some((p) => p.id === found.id)) {
        setAddError(`${found.name} has already been added.`);
        return;
      }

      setPlayers((prev) => [...prev, found]);
      setIdentifier('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to look up user');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCreate = async () => {
    setCreateError('');
    setLoading(true);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          creatorRole,
          rankPreference,
          players: players.map((p) => p.id),
          tiebreakers,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create match');
      }

      const data = await res.json();
      router.push(`/matches/${data.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create match');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium text-gray-900 dark:text-white mb-1">Add players</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Enter a player&apos;s exact username, email, or phone number to add them.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddPlayer();
              }
            }}
            placeholder="Username, email, or phone"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddPlayer}
            disabled={adding || !identifier.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
        {addError && <p className="text-sm text-red-600 mt-2">{addError}</p>}

        <div className="mt-4 space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{player.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">@{player.username}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(player.id)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          {players.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No players added yet.</p>
          )}
        </div>
      </div>

      {createError && <p className="text-red-500 text-sm">{createError}</p>}

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
          disabled={loading || players.length === 0}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Match'}
        </button>
      </div>
    </div>
  );
}
