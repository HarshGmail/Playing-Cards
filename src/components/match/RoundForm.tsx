'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Calculator } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { loadRoundDraft, saveRoundDraft } from '@/lib/hooks/useLocalStorageRoundScores';
import {
  allScoresEntered,
  emptyScoreDrafts,
  enterKeyAction,
  enterKeyHintFor,
  sanitizeScoreInput,
  toSubmittedScores,
  type ScoreDrafts,
} from '@/lib/domain/roundEntry';
import ScoreCalculatorModal from './ScoreCalculatorModal';

interface RoundFormProps {
  matchId: string;
  round: number;
  players: Array<{
    userId: string;
    userName: string;
  }>;
  onSubmit: (scores: Array<{ playerId: string; value: number }>) => void;
  showCalculator?: boolean;
  compact?: boolean;
}

interface DraftEntry {
  round: number;
  drafts: ScoreDrafts;
}

export default function RoundForm({
  matchId,
  round,
  players,
  onSubmit,
  showCalculator = false,
  compact = false,
}: RoundFormProps) {
  const { user } = useAuth();
  const userId = user?.id || '';
  const playerIds = players.map((player) => player.userId);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const submittedRoundRef = useRef<number | null>(null);

  const draftFor = (targetRound: number): ScoreDrafts =>
    loadRoundDraft({ matchId, userId, round: targetRound }) ?? emptyScoreDrafts(playerIds);

  const [entry, setEntry] = useState<DraftEntry>(() => ({ round, drafts: draftFor(round) }));
  const [error, setError] = useState('');
  const [calculatingFor, setCalculatingFor] = useState<string | null>(null);

  if (entry.round !== round) {
    submittedRoundRef.current = null;
    setEntry({ round, drafts: draftFor(round) });
    setError('');
  }

  const { drafts } = entry;

  useEffect(() => {
    saveRoundDraft({ matchId, userId, round: entry.round }, entry.drafts);
  }, [matchId, userId, entry]);

  const canSubmit = allScoresEntered(playerIds, drafts);

  const focusPlayer = (index: number, options?: FocusOptions) => {
    const input = inputRefs.current[index];
    if (!input) return;
    input.focus(options);
    input.select();
  };

  const updateScore = (playerId: string, rawValue: string) => {
    setError('');
    setEntry((current) => ({
      ...current,
      drafts: { ...current.drafts, [playerId]: sanitizeScoreInput(rawValue) },
    }));
  };

  const submit = () => {
    if (!canSubmit) {
      setError('All players must have scores');
      return;
    }
    if (submittedRoundRef.current === round) return;
    submittedRoundRef.current = round;
    setError('');
    onSubmit(toSubmittedScores(playerIds, drafts));
    focusPlayer(0, { preventScroll: true });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const action = enterKeyAction(index, players.length, canSubmit);
    if (action === 'focus-next') focusPlayer(index + 1);
    if (action === 'submit') submit();
    if (action === 'none') setError('All players must have scores');
  };

  const rowSpacing = compact ? 'space-y-2' : 'space-y-3';

  return (
    <div className="p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Round {round}</h3>
      <div className={`${rowSpacing} mb-4`}>
        {players.map((player, index) => (
          <div key={player.userId} className="flex items-center gap-2 sm:gap-3">
            <label
              htmlFor={`score-${player.userId}`}
              className="flex-1 min-w-0 truncate text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {player.userName}
            </label>
            {showCalculator && (
              <button
                type="button"
                onClick={() => setCalculatingFor(player.userId)}
                title={`Work out ${player.userName}'s score from their cards`}
                aria-label={`Work out ${player.userName}'s score from their cards`}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                <Calculator className="w-5 h-5" />
              </button>
            )}
            <input
              id={`score-${player.userId}`}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              enterKeyHint={enterKeyHintFor(index, players.length)}
              value={drafts[player.userId] ?? ''}
              onChange={(event) => updateScore(player.userId, event.target.value)}
              onFocus={(event) => event.target.select()}
              onKeyDown={(event) => handleKeyDown(event, index)}
              placeholder="0"
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right text-base tabular-nums focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
      >
        Submit Round
      </button>

      {calculatingFor && (
        <ScoreCalculatorModal
          playerName={players.find((p) => p.userId === calculatingFor)?.userName ?? 'player'}
          onClose={() => setCalculatingFor(null)}
          onUse={(score) => {
            updateScore(calculatingFor, String(score));
            setCalculatingFor(null);
          }}
        />
      )}
    </div>
  );
}
