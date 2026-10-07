'use client';

import { useMemo, useState } from 'react';
import { motion, LayoutGroup, useReducedMotion } from 'framer-motion';
import { ChevronUp, ChevronDown, RotateCcw, Crown } from 'lucide-react';
import { computeMatchDeltas } from '@/lib/domain/rating';
import { formatDelta } from '@/lib/domain/ratingExplainer';

interface SamplePlayer {
  id: string;
  name: string;
  rating: number;
}

const SAMPLE_PLAYERS: SamplePlayer[] = [
  { id: 'asha', name: 'Asha', rating: 1250 },
  { id: 'ben', name: 'Ben', rating: 1200 },
  { id: 'chen', name: 'Chen', rating: 1200 },
  { id: 'dev', name: 'Dev', rating: 1150 },
];

const MIN_ROUNDS = 1;
const MAX_ROUNDS = 25;
const DEFAULT_ROUNDS = 10;
const ROW_SPRING = { type: 'spring', stiffness: 500, damping: 38 } as const;

function swapAt<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

function deltaToneClasses(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded > 0) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (rounded < 0) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
}

const POSITION_BADGE_CLASSES = [
  'bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950',
  'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900',
  'bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950',
];
const DEFAULT_POSITION_BADGE = 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200';

function positionBadgeClasses(index: number): string {
  return POSITION_BADGE_CLASSES[index] ?? DEFAULT_POSITION_BADGE;
}

export default function RatingPlayground() {
  const [order, setOrder] = useState(SAMPLE_PLAYERS);
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS);
  const reduceMotion = useReducedMotion();

  const deltas = useMemo(() => {
    const ratings = new Map(SAMPLE_PLAYERS.map((p) => [p.id, p.rating]));
    const participants = order.map((p, index) => ({
      playerId: p.id,
      position: index + 1,
      isDnf: false,
    }));
    return computeMatchDeltas(ratings, participants, rounds);
  }, [order, rounds]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    setOrder((current) => swapAt(current, from, to));
  };

  const reset = () => {
    setOrder(SAMPLE_PLAYERS);
    setRounds(DEFAULT_ROUNDS);
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 p-4 sm:p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Try it
          </p>
          <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
            Rearrange the finish and watch the ratings move
          </h3>
        </div>
        <button
          type="button"
          onClick={reset}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      <LayoutGroup>
        <ol className="mt-5 space-y-2">
          {order.map((player, index) => {
            const delta = deltas.get(player.id) ?? 0;
            return (
              <motion.li
                key={player.id}
                layout={!reduceMotion}
                transition={ROW_SPRING}
                className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${positionBadgeClasses(index)}`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
                    {player.name}
                    {index === 0 && <Crown className="w-4 h-4 text-amber-500" aria-label="Winner" />}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                    {player.rating} → {Math.round(player.rating + delta)}
                  </p>
                </div>
                <motion.span
                  key={`${player.id}-${Math.round(delta)}`}
                  initial={reduceMotion ? false : { scale: 0.8, opacity: 0.4 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`min-w-[3.25rem] rounded-full px-2.5 py-1 text-center text-sm font-bold tabular-nums ${deltaToneClasses(delta)}`}
                >
                  {formatDelta(delta)}
                </motion.span>
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move ${player.name} up`}
                    className="rounded p-0.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-25 disabled:hover:bg-transparent"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, index + 1)}
                    disabled={index === order.length - 1}
                    aria-label={`Move ${player.name} down`}
                    className="rounded p-0.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-25 disabled:hover:bg-transparent"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </LayoutGroup>

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <label htmlFor="rounds" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Rounds played
          </label>
          <span className="text-2xl font-extrabold text-gray-900 dark:text-white tabular-nums">
            {rounds}
          </span>
        </div>
        <input
          id="rounds"
          type="range"
          min={MIN_ROUNDS}
          max={MAX_ROUNDS}
          value={rounds}
          onChange={(e) => setRounds(Number(e.target.value))}
          className="mt-2 w-full accent-blue-600"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Drag it: the same finish moves ratings further in a longer match.
        </p>
      </div>
    </div>
  );
}
