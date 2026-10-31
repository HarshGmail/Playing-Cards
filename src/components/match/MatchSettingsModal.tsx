'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toGameType, type GameType } from '@/lib/games/catalog';
import GamePicker, { type GameSelection } from '@/components/match/GamePicker';
import TargetRoundsField from '@/components/match/TargetRoundsField';
import { useDeleteMatchMutation, useUpdateMatchSettingsMutation } from '@/lib/queries/matchDetail';

type RankPreference = 'highest-first' | 'lowest-first';

interface MatchSettingsModalProps {
  matchId: string;
  match: {
    name: string;
    rankPreference: RankPreference;
    gameType?: GameType;
    gameLabel?: string | null;
    targetRounds?: number | null;
    roundsPlayed: number;
  };
  onClose: () => void;
}

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 50;

const FIELD_CLASSES =
  'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition';
const LABEL_CLASSES = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

export default function MatchSettingsModal({ matchId, match, onClose }: MatchSettingsModalProps) {
  const router = useRouter();
  const updateSettings = useUpdateMatchSettingsMutation(matchId);
  const deleteMatch = useDeleteMatchMutation(matchId);

  const [name, setName] = useState(match.name);
  const [gameType, setGameType] = useState<GameType>(toGameType(match.gameType));
  const [gameLabel, setGameLabel] = useState(match.gameLabel ?? '');
  const [rankPreference, setRankPreference] = useState<RankPreference>(match.rankPreference);
  const [targetRounds, setTargetRounds] = useState<number | null>(match.targetRounds ?? null);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const busy = updateSettings.isPending || deleteMatch.isPending;
  const scoringChanged = rankPreference !== match.rankPreference;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy && !confirmingDelete) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, confirmingDelete, onClose]);

  const handleGameChange = (selection: GameSelection) => {
    setGameType(selection.gameType);
    setGameLabel(selection.gameLabel);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < NAME_MIN_LENGTH || trimmedName.length > NAME_MAX_LENGTH) {
      setError(`Match name must be ${NAME_MIN_LENGTH}-${NAME_MAX_LENGTH} characters`);
      return;
    }
    if (gameType === 'other' && !gameLabel.trim()) {
      setError('Name the game you are playing');
      return;
    }

    setError('');
    try {
      await updateSettings.mutateAsync({
        name: trimmedName,
        rankPreference,
        gameType,
        gameLabel: gameType === 'other' ? gameLabel.trim() : undefined,
        targetRounds,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMatch.mutateAsync();
      router.push('/dashboard');
    } catch (err) {
      setConfirmingDelete(false);
      setError(err instanceof Error ? err.message : 'Could not delete the match');
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        onClick={() => !busy && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-settings-title"
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] w-full space-y-5 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-800 sm:max-w-lg sm:rounded-lg sm:p-6"
        >
          <div className="flex items-center justify-between">
            <h2
              id="match-settings-title"
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              Match settings
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
              className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-50 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div>
            <label htmlFor="match-settings-name" className={LABEL_CLASSES}>
              Match name
            </label>
            <input
              id="match-settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX_LENGTH}
              className={FIELD_CLASSES}
            />
          </div>

          <GamePicker
            value={{ gameType, gameLabel }}
            onChange={handleGameChange}
            fieldClassName={FIELD_CLASSES}
            labelClassName={LABEL_CLASSES}
          />

          <TargetRoundsField
            value={targetRounds}
            onChange={setTargetRounds}
            fieldClassName={FIELD_CLASSES}
            labelClassName={LABEL_CLASSES}
          />

          <div>
            <label htmlFor="match-settings-ranking" className={LABEL_CLASSES}>
              Ranking preference
            </label>
            <select
              id="match-settings-ranking"
              value={rankPreference}
              onChange={(e) => setRankPreference(e.target.value as RankPreference)}
              className={FIELD_CLASSES}
            >
              <option value="highest-first">Highest score wins</option>
              <option value="lowest-first">Lowest score wins</option>
            </select>
            {scoringChanged && match.roundsPlayed > 0 && (
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                Standings and ratings will be recalculated for the rounds already played.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-900 transition hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {updateSettings.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>

          <div className="border-t border-red-200 pt-4 dark:border-red-900/50">
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h3>
            <p className="mb-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
              Deleting removes this match for everyone and takes its results out of all stats and
              ratings.
            </p>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700 disabled:opacity-50 sm:w-auto"
            >
              <Trash2 className="h-4 w-4" />
              Delete match
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this match?"
        message={`"${match.name}" and its ${match.roundsPlayed} round${
          match.roundsPlayed === 1 ? '' : 's'
        } will be removed for every player. This cannot be undone from the app.`}
        confirmLabel={deleteMatch.isPending ? 'Deleting...' : 'Delete'}
        destructive
        busy={deleteMatch.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
