'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLocalStorageRoundScores } from '@/lib/hooks/useLocalStorageRoundScores';

interface EditRoundModalProps {
  matchId: string;
  round: number;
  players: Array<{
    userId: string;
    userName: string;
  }>;
  existingScores: Array<{ playerId: string; value: number }>;
  initialDnfPlayerIds: string[];
  canUndoDnf: boolean;
  onClose: () => void;
  onSave: (
    scores: Array<{ playerId: string; value: number }>,
    dnfPlayerIds: string[]
  ) => Promise<void>;
}

export default function EditRoundModal({
  matchId,
  round,
  players,
  existingScores,
  initialDnfPlayerIds,
  canUndoDnf,
  onClose,
  onSave,
}: EditRoundModalProps) {
  const { user } = useAuth();
  const { loadSavedScores, saveScores, clearSavedScores } = useLocalStorageRoundScores({
    matchId,
    userId: user?.id || '',
    round,
    isEdit: true,
  });

  const byPlayerId = new Map(existingScores.map((s) => [s.playerId, s.value]));
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const saved = loadSavedScores();
    if (saved) return saved;
    return Object.fromEntries(players.map((p) => [p.userId, String(byPlayerId.get(p.userId) ?? '')]));
  });
  const [dnfPlayerIds, setDnfPlayerIds] = useState<Set<string>>(
    () => new Set(initialDnfPlayerIds)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scoringPlayers = players.filter((p) => !dnfPlayerIds.has(p.userId));
  const hasMissingScore = scoringPlayers.some((p) => !scores[p.userId]);
  const hasNoScoringPlayer = scoringPlayers.length === 0;

  const isDnfLocked = (playerId: string) =>
    !canUndoDnf && initialDnfPlayerIds.includes(playerId);

  const toggleDnf = (playerId: string) => {
    setDnfPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  useEffect(() => {
    saveScores(scores);
  }, [scores, saveScores]);

  const handleScoreChange = (playerId: string, value: string) => {
    setScores((prev) => ({
      ...prev,
      [playerId]: value === '' ? '' : Math.max(0, Math.min(99999, parseInt(value) || 0)).toString(),
    }));
  };

  const handleSave = async () => {
    if (hasMissingScore) {
      setError('Every player not marked DNF needs a score');
      return;
    }
    if (hasNoScoringPlayer) {
      setError('At least one player must have a score');
      return;
    }

    setLoading(true);
    try {
      const scoresArray = scoringPlayers.map((p) => ({
        playerId: p.userId,
        value: parseInt(scores[p.userId]),
      }));
      await onSave(scoresArray, Array.from(dnfPlayerIds));
      clearSavedScores();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save round');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Round {round}</h2>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {players.map((player) => {
            const isDnf = dnfPlayerIds.has(player.userId);
            return (
              <div key={player.userId} className="flex items-center gap-3">
                <label className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {player.userName}
                </label>
                <button
                  type="button"
                  onClick={() => toggleDnf(player.userId)}
                  disabled={loading || isDnfLocked(player.userId)}
                  aria-pressed={isDnf}
                  title={
                    isDnfLocked(player.userId)
                      ? 'A DNF can only be undone on the latest round'
                      : `Mark ${player.userName} as Did Not Finish from this round`
                  }
                  className={`px-2 py-1 text-xs font-semibold rounded border transition disabled:opacity-50 ${
                    isDnf
                      ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
                      : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  DNF
                </button>
                <input
                  type="number"
                  min="0"
                  max="99999"
                  value={isDnf ? '' : scores[player.userId] ?? ''}
                  onChange={(e) => handleScoreChange(player.userId, e.target.value)}
                  placeholder={isDnf ? '—' : '0'}
                  disabled={loading || isDnf}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50"
                />
              </div>
            );
          })}
        </div>

        {dnfPlayerIds.size > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            DNF players get no score from this round onward, and any later scores they have are removed.
          </p>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || hasMissingScore || hasNoScoringPlayer}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
