'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface EditRoundModalProps {
  round: number;
  players: Array<{
    userId: string;
    userName: string;
  }>;
  existingScores: Array<{ playerId: string; value: number }>;
  onClose: () => void;
  onSave: (scores: Array<{ playerId: string; value: number }>) => Promise<void>;
}

export default function EditRoundModal({
  round,
  players,
  existingScores,
  onClose,
  onSave,
}: EditRoundModalProps) {
  const byPlayerId = new Map(existingScores.map((s) => [s.playerId, s.value]));
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(players.map((p) => [p.userId, String(byPlayerId.get(p.userId) ?? '')]))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleScoreChange = (playerId: string, value: string) => {
    setScores((prev) => ({
      ...prev,
      [playerId]: value === '' ? '' : Math.max(0, Math.min(99999, parseInt(value) || 0)).toString(),
    }));
  };

  const handleSave = async () => {
    if (Object.values(scores).some((s) => s === '')) {
      setError('All players must have scores');
      return;
    }

    setLoading(true);
    try {
      const scoresArray = players.map((p) => ({
        playerId: p.userId,
        value: parseInt(scores[p.userId]),
      }));
      await onSave(scoresArray);
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
          {players.map((player) => (
            <div key={player.userId} className="flex items-center gap-3">
              <label className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {player.userName}
              </label>
              <input
                type="number"
                min="0"
                max="99999"
                value={scores[player.userId]}
                onChange={(e) => handleScoreChange(player.userId, e.target.value)}
                placeholder="0"
                disabled={loading}
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50"
              />
            </div>
          ))}
        </div>

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
            disabled={loading || Object.values(scores).some((s) => s === '')}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
