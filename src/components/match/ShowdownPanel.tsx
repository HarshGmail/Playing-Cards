'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BarChart3, PenLine } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import { showdownTallies, type ShowdownRound } from '@/lib/domain/showdownStats';
import type { PlayersById } from '@/types';
import { SHOWDOWN_TALLY_ROWS } from './showdownStyles';

type PanelFace = 'form' | 'stats';

interface ShowdownPanelProps {
  rounds: ShowdownRound[];
  players: Array<{ userId: string; userName: string }>;
  playersById: PlayersById;
  roundsPlayed: number;
  form: ReactNode | null;
}

const FLIP = { duration: 0.22, ease: 'easeInOut' } as const;

function StatsFace({ rounds, players, playersById }: Pick<ShowdownPanelProps, 'rounds' | 'players' | 'playersById'>) {
  const tallies = showdownTallies(rounds, players.map((player) => player.userId));
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <th className="pb-2 text-left">Player</th>
          {SHOWDOWN_TALLY_ROWS.map((column) => (
            <th key={column.key} className="pb-2 text-center" title={column.label}>
              {column.label.split(' ')[0]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
        {players.map((player) => {
          const tally = tallies.get(player.userId);
          return (
            <tr key={player.userId}>
              <td className="py-2 pr-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={player.userName} profilePicUrl={playersById[player.userId]?.profilePicUrl} size={22} />
                  <span className="truncate font-medium text-gray-900 dark:text-white">{player.userName}</span>
                </span>
              </td>
              {SHOWDOWN_TALLY_ROWS.map((column) => (
                <td key={column.key} className={`py-2 text-center font-bold tabular-nums ${column.className}`}>
                  {tally?.[column.key] ?? 0}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ShowdownPanel({ rounds, players, playersById, roundsPlayed, form }: ShowdownPanelProps) {
  const reduceMotion = useReducedMotion();
  const [face, setFace] = useState<PanelFace>(form ? 'form' : 'stats');
  const lastRoundsPlayed = useRef(roundsPlayed);
  const visibleFace: PanelFace = form ? face : 'stats';

  useEffect(() => {
    if (roundsPlayed > lastRoundsPlayed.current) setFace('stats');
    lastRoundsPlayed.current = roundsPlayed;
  }, [roundsPlayed]);

  return (
    <div style={{ perspective: 1000 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={visibleFace}
          initial={reduceMotion ? { opacity: 0 } : { rotateY: -90, opacity: 0.6 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { rotateY: 90, opacity: 0.6 }}
          transition={FLIP}
        >
          {visibleFace === 'form' ? (
            <div className="space-y-2">
              {form}
              <button
                type="button"
                onClick={() => setFace('stats')}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              >
                <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                Showdown stats
              </button>
            </div>
          ) : (
            <section
              aria-labelledby="showdown-stats-heading"
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <h3 id="showdown-stats-heading" className="mb-3 font-semibold text-gray-900 dark:text-white">
                Showdown stats
              </h3>
              <StatsFace rounds={rounds} players={players} playersById={playersById} />
              {form && (
                <button
                  type="button"
                  onClick={() => setFace('form')}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <PenLine className="h-4 w-4" aria-hidden />
                  Enter round {roundsPlayed + 1}
                </button>
              )}
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
