'use client';

import {
  CardId,
  COPIES_PER_CARD,
  RANKS,
  SUITS,
  SUIT_SYMBOL,
  isRedSuit,
  toCardId,
} from '@/lib/cards/card';
import PlayingCard from './PlayingCard';

interface CardPickerProps {
  /** Copies held per card id. Absent means zero. */
  value: Record<CardId, number>;
  onChange: (next: Record<CardId, number>) => void;
  /** Total cards to collect, e.g. 13 for a full hand. */
  total: number;
  disabled?: boolean;
}

/**
 * A 52-cell grid for entering a hand on a phone.
 *
 * Fixed at four columns, one per suit, A at the top down to K — the layout your
 * hand is already sorted into, so the eye lands on the right cell without
 * reading. Reflowing to two or three columns would split a suit across columns
 * and cost more than the width it saves.
 *
 * Tapping cycles 0 → 1 → 2 → 0 rather than toggling, because two decks are in
 * play and holding the same card twice is legal.
 */
export default function CardPicker({
  value,
  onChange,
  total,
  disabled = false,
}: CardPickerProps) {
  const selectedCount = Object.values(value).reduce((sum, n) => sum + n, 0);
  const remaining = total - selectedCount;

  const cycle = (id: CardId) => {
    const current = value[id] ?? 0;
    // Wrap at the copy limit, and refuse to add past the target — but always
    // allow stepping down, so a full selection is never stuck.
    const next = current >= COPIES_PER_CARD ? 0 : current + 1;
    if (next > current && remaining <= 0) return;

    const updated = { ...value };
    if (next === 0) delete updated[id];
    else updated[id] = next;
    onChange(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {selectedCount} of {total} cards
          {remaining > 0 && (
            <span className="text-gray-500 dark:text-gray-400 font-normal">
              {' '}
              — {remaining} to go
            </span>
          )}
        </p>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={() => onChange({})}
            disabled={disabled}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {SUITS.map((suit) => (
          <div
            key={suit}
            className={`text-center text-lg leading-none pb-0.5 ${
              isRedSuit(suit) ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {SUIT_SYMBOL[suit]}
          </div>
        ))}

        {RANKS.map((rank) =>
          SUITS.map((suit) => {
            const id = toCardId({ rank, suit });
            const count = value[id] ?? 0;
            return (
              <PlayingCard
                key={id}
                card={{ rank, suit }}
                count={count}
                onClick={() => cycle(id)}
                // Grey out what can no longer be added, but keep held cards
                // tappable so a mistake can always be undone.
                disabled={disabled || (remaining <= 0 && count === 0)}
              />
            );
          })
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Tap once for one copy, twice for two — two decks are in play.
      </p>
    </div>
  );
}
