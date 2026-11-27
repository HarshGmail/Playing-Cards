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
import type { SubmittedScore as SubmittedRoundScore } from '@/lib/domain/optimisticRound';
import { WRONG_SHOW_PENALTY, withWrongShowPenalty } from '@/lib/domain/showdownStats';
import ScoreCalculatorModal from './ScoreCalculatorModal';

interface RoundFormProps {
  matchId: string;
  round: number;
  players: Array<{
    userId: string;
    userName: string;
  }>;
  onSubmit: (scores: SubmittedRoundScore[]) => void;
  showCalculator?: boolean;
  showWrongShow?: boolean;
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
  showWrongShow = false,
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
  const [wrongShowBy, setWrongShowBy] = useState<string | null>(null);

  if (entry.round !== round) {
    submittedRoundRef.current = null;
    setEntry({ round, drafts: draftFor(round) });
    setWrongShowBy(null);
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
    onSubmit(
      toSubmittedScores(playerIds, drafts).map((score) =>
        score.playerId === wrongShowBy
          ? { ...score, value: withWrongShowPenalty(score.value, true), wrongShow: true }
          : score
      )
    );
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
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Round {round}</h3>
      <div className={`${rowSpacing} mb-4`}>
        {players.map((player, index) => {
          const isWrongShow = wrongShowBy === player.userId;
          const typed = drafts[player.userId] ?? '';
          return (
            <div key={player.userId} className="flex items-center gap-2 sm:gap-3">
              <label
                htmlFor={`score-${player.userId}`}
                className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {player.userName}
                {isWrongShow && typed !== '' && (
                  <span className="block text-[11px] font-semibold tabular-nums text-red-600 dark:text-red-400">
                    Wrong show: {typed} → {withWrongShowPenalty(Number(typed), true)}
                  </span>
                )}
              </label>
              {showWrongShow && (
                <button
                  type="button"
                  onClick={() => setWrongShowBy(isWrongShow ? null : player.userId)}
                  aria-pressed={isWrongShow}
                  title={
                    isWrongShow
                      ? 'Undo wrong show'
                      : `Mark ${player.userName}'s show as wrong (+${WRONG_SHOW_PENALTY})`
                  }
                  className={`shrink-0 rounded-lg border px-2 py-1.5 text-xs font-bold tabular-nums transition ${
                    isWrongShow
                      ? 'border-red-500 bg-red-500 text-white'
                      : 'border-gray-300 text-gray-500 hover:border-red-400 hover:text-red-600 dark:border-gray-600 dark:text-gray-400'
                  }`}
                >
                  +{WRONG_SHOW_PENALTY}
                </button>
              )}
              {showCalculator && (
                <button
                  type="button"
                  onClick={() => setCalculatingFor(player.userId)}
                  title={`Work out ${player.userName}'s score from their cards`}
                  aria-label={`Work out ${player.userName}'s score from their cards`}
                  className="p-2 text-gray-500 transition hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                >
                  <Calculator className="h-5 w-5" />
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
                className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-base tabular-nums text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          );
        })}
      </div>
      {showWrongShow && (
        <p className="-mt-2 mb-3 text-[11px] text-gray-500 dark:text-gray-400">
          Enter card totals. Tap +{WRONG_SHOW_PENALTY} on whoever called a wrong show.
        </p>
      )}

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
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
