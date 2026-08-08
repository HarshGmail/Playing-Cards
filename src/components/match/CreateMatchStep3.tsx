'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  useFriendsQuery,
  useAddFriendMutation,
} from '@/lib/queries/friends';
import {
  useUserSearchQuery,
  useResolveUserMutation,
} from '@/lib/queries/users';
import { useCreateMatchMutation } from '@/lib/queries/matches';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

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
  const { user } = useAuth();
  const { data: friends = [] } = useFriendsQuery();
  const addFriendMutation = useAddFriendMutation();
  const createMatchMutation = useCreateMatchMutation();
  const resolveUserMutation = useResolveUserMutation();
  const [identifier, setIdentifier] = useState('');
  const [players, setPlayers] = useState<AddedPlayer[]>([]);
  const [spectators, setSpectators] = useState<AddedPlayer[]>([]);
  const [addError, setAddError] = useState('');
  const [createError, setCreateError] = useState('');
  const debouncedIdentifier = useDebouncedValue(identifier, 300);
  const { data: suggestions = [], isLoading: searching } =
    useUserSearchQuery(debouncedIdentifier);


  const addPlayer = (found: AddedPlayer) => {
    if (found.id === user?.id) {
      setAddError("That's you — you're already in the match.");
      return;
    }
    if (players.some((p) => p.id === found.id)) {
      setAddError(`${found.name} has already been added.`);
      return;
    }

    setAddError('');
    setSpectators((prev) => prev.filter((p) => p.id !== found.id));
    setPlayers((prev) => [...prev, found]);
    setIdentifier('');
  };

  const addSpectator = (found: AddedPlayer) => {
    if (found.id === user?.id) {
      setAddError("That's you — you're already in the match.");
      return;
    }
    if (players.some((p) => p.id === found.id)) {
      setAddError(`${found.name} is already added as a player.`);
      return;
    }
    if (spectators.some((p) => p.id === found.id)) {
      setAddError(`${found.name} has already been added as a spectator.`);
      return;
    }

    setAddError('');
    setSpectators((prev) => [...prev, found]);
    setIdentifier('');
  };

  const handleAddPlayer = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) return;

    setAddError('');
    try {
      const user = await resolveUserMutation.mutateAsync({ identifier: trimmed });
      addPlayer({ id: user.id, name: user.name, username: user.username });
    } catch (err: any) {
      setAddError(err.message || 'Failed to look up user');
    }
  };

  const handleRemove = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleRemoveSpectator = (id: string) => {
    setSpectators((prev) => prev.filter((p) => p.id !== id));
  };

  const addableFriends = friends.filter(
    (f) => !players.some((p) => p.id === f.id) && !spectators.some((p) => p.id === f.id)
  );

  const handleCreate = async () => {
    setCreateError('');
    try {
      const result = await createMatchMutation.mutateAsync({
        name,
        creatorRole: creatorRole as 'score-only' | 'score-and-play',
        rankPreference: rankPreference as 'highest-first' | 'lowest-first',
        tiebreakers,
        players: players.map((p) => p.id),
        spectatorIds: spectators.map((s) => s.id),
      });
      router.push(`/matches/${result.id}`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create match');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium text-gray-900 dark:text-white mb-1">Invite players</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Search by username or name, or enter an exact email/phone. Each player gets an
          invite and joins the match once they accept — you can start scoring as soon as
          one of them does. Spectators are added straight away.
        </p>

        <div className="relative">
          <div className="flex gap-2">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (suggestions.length > 0) {
                    addPlayer(suggestions[0]);
                  } else {
                    handleAddPlayer();
                  }
                }
              }}
              placeholder="Username, name, email, or phone"
              autoComplete="off"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddPlayer}
              disabled={resolveUserMutation.isPending || !identifier.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {resolveUserMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>

          {identifier.trim() && (suggestions.length > 0 || searching) && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
              {searching && suggestions.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Searching...</p>
              )}
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <button
                    type="button"
                    onClick={() => addPlayer(s)}
                    className="flex-1 text-left"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{s.name}</span>{' '}
                    <span className="text-xs text-gray-500 dark:text-gray-400">@{s.username}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addSpectator(s)}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Spectate
                    </button>
                    <button
                      type="button"
                      onClick={() => addPlayer(s)}
                      className="text-xs text-blue-600 dark:text-blue-400"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            <p className="text-sm text-gray-500 dark:text-gray-400">No players invited yet.</p>
          )}
        </div>

        {spectators.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Spectators
            </h3>
            <div className="space-y-2">
              {spectators.map((spectator) => (
                <div
                  key={spectator.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{spectator.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      @{spectator.username}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSpectator(spectator.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {addableFriends.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Friends</h3>
            <div className="space-y-2">
              {addableFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{friend.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">@{friend.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addSpectator(friend)}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded text-sm font-medium"
                    >
                      Add as spectator
                    </button>
                    <button
                      type="button"
                      onClick={() => addPlayer(friend)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {createError && <p className="text-red-500 text-sm">{createError}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={createMatchMutation.isPending}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleCreate}
          disabled={createMatchMutation.isPending || players.length === 0}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50"
        >
          {createMatchMutation.isPending ? 'Creating...' : 'Create Match'}
        </button>
      </div>
    </div>
  );
}
