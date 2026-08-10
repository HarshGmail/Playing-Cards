'use client';

import { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLocalStorageRoundScores } from '@/lib/hooks/useLocalStorageRoundScores';
import ScoreCalculatorModal from './ScoreCalculatorModal';

interface RoundFormProps {
  matchId: string;
  round: number;
  players: Array<{
    userId: string;
    userName: string;
  }>;
  onSubmit: (scores: Array<{ playerId: string; value: number }>) => Promise<void>;
  /**
   * Whether the card-based score calculator applies. It encodes Least Count's
   * rules, so it has no business appearing on a match of some other game.
   */
  showCalculator?: boolean;
}

export default function RoundForm({
  matchId,
  round,
  players,
  onSubmit,
  showCalculator = false,
}: RoundFormProps) {
  const { user } = useAuth();
  const { loadSavedScores, saveScores, clearSavedScores } = useLocalStorageRoundScores({
    matchId,
    userId: user?.id || '',
    round,
    isEdit: false,
  });

  const [scores, setScores] = useState<Record<string, string>>(() => {
    const saved = loadSavedScores();
    return saved || Object.fromEntries(players.map((p) => [p.userId, '']));
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calculatingFor, setCalculatingFor] = useState<string | null>(null);

  useEffect(() => {
    saveScores(scores);
  }, [scores, saveScores]);

  const handleScoreChange = (playerId: string, value: string) => {
    setScores((prev) => ({
      ...prev,
      [playerId]: value === '' ? '' : Math.max(0, Math.min(99999, parseInt(value) || 0)).toString(),
    }));
  };

  const handleSubmit = async () => {
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
      await onSubmit(scoresArray);
      clearSavedScores();
      setScores(Object.fromEntries(players.map((p) => [p.userId, ''])));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit round');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Round {round}</h3>
      <div className="space-y-3 mb-4">
        {players.map((player) => (
          <div key={player.userId} className="flex items-center gap-3">
            <label className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {player.userName}
            </label>
            {showCalculator && (
              <button
                type="button"
                onClick={() => setCalculatingFor(player.userId)}
                disabled={loading}
                title={`Work out ${player.userName}'s score from their cards`}
                aria-label={`Work out ${player.userName}'s score from their cards`}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition disabled:opacity-50"
              >
                <Calculator className="w-5 h-5" />
              </button>
            )}
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

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || Object.values(scores).some((s) => s === '')}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Round'}
      </button>

      {calculatingFor && (
        <ScoreCalculatorModal
          playerName={
            players.find((p) => p.userId === calculatingFor)?.userName ?? 'player'
          }
          onClose={() => setCalculatingFor(null)}
          onUse={(score) => {
            handleScoreChange(calculatingFor, String(score));
            setCalculatingFor(null);
          }}
        />
      )}
    </div>
  );
}
