'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Step2Props {
  rankPreference: 'highest-first' | 'lowest-first';
  onNext: (tiebreakers: string[]) => void;
  onBack: () => void;
}

const LABELS: Record<string, string> = {
  'lower-average': 'Lower average wins',
  'higher-average': 'Higher average wins',
  'more-consistent': 'More consistent (lower std. deviation)',
  'less-consistent': 'Less consistent (higher std. deviation)',
};

function defaultOrderFor(rankPreference: 'highest-first' | 'lowest-first'): string[] {
  const averageCriterion = rankPreference === 'highest-first' ? 'higher-average' : 'lower-average';
  return ['more-consistent', averageCriterion, 'less-consistent'];
}

export default function CreateMatchStep2({ rankPreference, onNext, onBack }: Step2Props) {
  const [order, setOrder] = useState<string[]>(() => defaultOrderFor(rankPreference));

  // If the user goes back to Step 1 and flips rank preference, the average
  // criterion flips too — re-filter and reset to default rather than leaving
  // a contradictory criterion (e.g. "higher-average" under lowest-first) selected.
  useEffect(() => {
    setOrder(defaultOrderFor(rankPreference));
  }, [rankPreference]);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium text-gray-900 dark:text-white mb-1">Tiebreaker order</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          When totals tie, these criteria are applied in order until one separates the players.
        </p>

        <div className="space-y-2">
          {order.map((criterion, index) => (
            <div
              key={criterion}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                  {index + 1}
                </span>
                <span className="text-gray-900 dark:text-white">{LABELS[criterion]}</span>
              </div>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                  className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-600"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === order.length - 1}
                  aria-label="Move down"
                  className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-600"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Average only separates players who played a different number of rounds.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
        >
          Back
        </button>
        <button
          onClick={() => onNext(order)}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          Next: Players
        </button>
      </div>
    </div>
  );
}
