'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  Card,
  CardId,
  HAND_SIZE,
  PURE_RUN_SIZE,
  RANKS,
  RANK_LABEL,
  Rank,
  handFromCounts,
  handLabel,
  handPoints,
  toCardId,
} from '@/lib/cards/card';
import { isPureRun } from '@/lib/cards/melds';
import { bestGrouping, scoreWithoutPureRun } from '@/lib/cards/score';
import CardPicker from '@/components/cards/CardPicker';
import PlayingCard from '@/components/cards/PlayingCard';

interface ScoreCalculatorModalProps {
  playerName: string;
  onClose: () => void;
  onUse: (score: number) => void;
}

/** Every way to pick PURE_RUN_SIZE cards out of the hand that forms a pure run. */
function findPureRuns(hand: Card[]): number[][] {
  const runs: number[][] = [];
  const pick: number[] = [];

  const walk = (start: number) => {
    if (pick.length === PURE_RUN_SIZE) {
      if (isPureRun(pick.map((i) => hand[i]))) runs.push([...pick]);
      return;
    }
    for (let i = start; i < hand.length; i += 1) {
      pick.push(i);
      walk(i + 1);
      pick.pop();
    }
  };

  walk(0);
  return runs;
}

/**
 * Works out what a player is charged at the end of a round, so nobody has to do
 * it in their head. See docs/LEAST_COUNT.md for the three scoring cases.
 *
 * The result updates live as cards go in rather than behind a Calculate button —
 * seeing the number move as you select is what makes it obvious when you have
 * mis-tapped a card.
 */
export default function ScoreCalculatorModal({
  playerName,
  onClose,
  onUse,
}: ScoreCalculatorModalProps) {
  const [laidRun, setLaidRun] = useState(true);
  const [counts, setCounts] = useState<Record<CardId, number>>({});
  const [runIndices, setRunIndices] = useState<number[]>([]);
  const [wildRank, setWildRank] = useState<Rank | null>(null);

  const hand = useMemo(() => handFromCounts(counts), [counts]);
  const complete = hand.length === HAND_SIZE;

  // Offered as a shortcut: if the hand contains exactly one pure run there is
  // nothing to choose, so let the player accept it instead of re-tapping it.
  const availableRuns = useMemo(
    () => (laidRun && complete ? findPureRuns(hand) : []),
    [laidRun, complete, hand]
  );

  const runCards = runIndices.map((i) => hand[i]);
  const runIsValid = runCards.length === PURE_RUN_SIZE && isPureRun(runCards);
  const rest = hand.filter((_, i) => !runIndices.includes(i));

  const toggleRunCard = (index: number) => {
    setRunIndices((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : prev.length >= PURE_RUN_SIZE
          ? prev
          : [...prev, index]
    );
  };

  // Changing the hand invalidates any run picked out of the old one.
  const handleCountsChange = (next: Record<CardId, number>) => {
    setCounts(next);
    setRunIndices([]);
  };

  const grouping = useMemo(
    () => (laidRun && runIsValid ? bestGrouping(rest, wildRank) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [laidRun, runIsValid, handLabel(rest), wildRank]
  );

  const score = !complete
    ? null
    : laidRun
      ? (grouping?.score ?? null)
      : scoreWithoutPureRun(hand);

  const canUse = score !== null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-4 sm:p-6 space-y-4 my-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Work out {playerName}&apos;s score
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter the {HAND_SIZE} cards they were holding.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2">
          {[
            { laid: true, label: 'Laid their run' },
            { laid: false, label: 'Never laid a run' },
          ].map((option) => (
            <button
              key={String(option.laid)}
              type="button"
              onClick={() => setLaidRun(option.laid)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition border ${
                laidRun === option.laid
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {!laidRun && (
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            Without a pure run laid down, every card counts at face value — no
            credit for runs or sets, and wilds count as themselves.
          </p>
        )}

        <CardPicker value={counts} onChange={handleCountsChange} total={HAND_SIZE} />

        {laidRun && complete && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Which four did they lay?
              </p>
              {availableRuns.length === 1 && runIndices.length === 0 && (
                <button
                  type="button"
                  onClick={() => setRunIndices(availableRuns[0])}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Use {handLabel(availableRuns[0].map((i) => hand[i]))}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {hand.map((card, index) => (
                <PlayingCard
                  key={`${toCardId(card)}-${index}`}
                  card={card}
                  size="chip"
                  count={runIndices.includes(index) ? 1 : 0}
                  onClick={() => toggleRunCard(index)}
                />
              ))}
            </div>

            {availableRuns.length === 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                No pure run exists in these cards. Check the hand, or switch to
                &ldquo;never laid a run&rdquo;.
              </p>
            )}
            {runIndices.length === PURE_RUN_SIZE && !runIsValid && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {handLabel(runCards)} is not a pure run — four of one suit in a
                row, and the ace does not wrap.
              </p>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Joker rank{' '}
                <span className="font-normal text-gray-500 dark:text-gray-400">
                  (the tiplu — optional)
                </span>
              </p>
              <div className="flex flex-wrap gap-1">
                {RANKS.map((rank) => (
                  <button
                    key={rank}
                    type="button"
                    onClick={() => setWildRank(wildRank === rank ? null : rank)}
                    className={`w-9 h-9 rounded-md border text-sm font-medium transition ${
                      wildRank === rank
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {RANK_LABEL[rank]}
                  </button>
                ))}
              </div>
              {wildRank === null && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave blank if unknown — the score will be worked out without
                  wilds, which can only be too high, never too low.
                </p>
              )}
            </div>
          </div>
        )}

        {score !== null && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Best possible score
              </span>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {score}
              </span>
            </div>

            {grouping && (
              <div className="mt-3 space-y-2 text-sm">
                {runCards.length > 0 && (
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Laid run</span> (free):{' '}
                    {handLabel(runCards)}
                  </p>
                )}
                {grouping.groups.map((group, i) => (
                  <p key={i} className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">
                      {group.kinds.run ? 'Sequence' : 'Set'}
                    </span>{' '}
                    (free): {handLabel(group.cards)}
                  </p>
                ))}
                <p className="text-gray-900 dark:text-white">
                  <span className="font-medium">Loose</span>:{' '}
                  {grouping.leftover.length > 0
                    ? `${handLabel(grouping.leftover)} = ${grouping.score}`
                    : 'nothing — this hand declares'}
                </p>
              </div>
            )}

            {!laidRun && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                All {HAND_SIZE} cards at face value = {handPoints(hand)}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={() => score !== null && onUse(score)}
            disabled={!canUse}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            {canUse ? `Use ${score}` : 'Use score'}
          </button>
        </div>
      </div>
    </div>
  );
}
