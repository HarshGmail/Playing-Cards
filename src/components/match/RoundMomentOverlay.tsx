'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import Avatar from '@/components/common/Avatar';
import { getPositionColor } from '@/lib/domain/positionColor';
import {
  hasShuffle,
  momentHeadline,
  momentSubline,
  streakCheer,
  type MomentPlayer,
  type RoundMoment,
  type StreakNote,
} from '@/lib/domain/roundMoments';
import type { PlayersById } from '@/types';
import { POSITION_CLASSES } from './positionClasses';

const SHUFFLE_DELAY_MS = 450;
const VISIBLE_MS = 2400;
const ROW_SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const;

interface RoundMomentOverlayProps {
  moment: RoundMoment;
  round: number;
  playersById: PlayersById;
  onDone: () => void;
}

function FireCount({ note, settled }: { note: StreakNote; settled: boolean }) {
  const count = settled ? note.to : note.from;
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[11px] font-black text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
      🔥
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={count}
          initial={{ y: 8, opacity: 0, scale: 1.6 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          className="tabular-nums"
        >
          {count}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function rowTint(moment: RoundMoment, playerId: string, settled: boolean): string {
  if (!settled) return '';
  if (moment.climbers.some((c) => c.playerId === playerId)) return 'bg-emerald-50 dark:bg-emerald-900/25';
  if (moment.fallers.some((f) => f.playerId === playerId)) return 'bg-red-50 dark:bg-red-900/20';
  return '';
}

function ShuffleCard({ moment, round, playersById }: Omit<RoundMomentOverlayProps, 'onDone'>) {
  const reduceMotion = useReducedMotion();
  const [settled, setSettled] = useState(!!reduceMotion);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setSettled(true), SHUFFLE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  const rows: MomentPlayer[] = [...(settled ? moment.after : moment.before)]
    .filter((player) => !player.isDnf)
    .sort((a, b) => a.position - b.position);
  const streakById = new Map(moment.streaks.map((note) => [note.playerId, note]));
  const subline = momentSubline(moment);

  return (
    <>
      <p className="text-center text-lg font-black leading-tight text-gray-900 dark:text-white">
        {momentHeadline(moment, round)}
      </p>
      <LayoutGroup id={`round-moment-${round}`}>
        <ol className="mt-3 space-y-1">
          {rows.map((player) => {
            const colors = POSITION_CLASSES[getPositionColor(player.position, false, false)];
            const note = streakById.get(player.playerId);
            return (
              <motion.li
                key={player.playerId}
                layout="position"
                transition={ROW_SPRING}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${rowTint(moment, player.playerId, settled)}`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${colors.badge}`}>
                  {player.position}
                </span>
                <Avatar name={player.name} profilePicUrl={playersById[player.playerId]?.profilePicUrl} size={24} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {player.name}
                </span>
                {note && <FireCount note={note} settled={settled} />}
                <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900 dark:text-white">{player.total}</span>
              </motion.li>
            );
          })}
        </ol>
      </LayoutGroup>
      {subline && <p className="mt-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">{subline}</p>}
    </>
  );
}

function StreakCard({ note, round, playersById }: { note: StreakNote; round: number; playersById: PlayersById }) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), SHUFFLE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <Avatar name={note.name} profilePicUrl={playersById[note.playerId]?.profilePicUrl} size={72} />
        <span className="absolute -bottom-2 -right-3">
          <FireCount note={note} settled={settled} />
        </span>
      </div>
      <p className="mt-4 text-lg font-black leading-tight text-gray-900 dark:text-white">{streakCheer(note, round)}</p>
    </div>
  );
}

export default function RoundMomentOverlay({ moment, round, playersById, onDone }: RoundMomentOverlayProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  const [firstStreak] = moment.streaks;

  return (
    <div className="pointer-events-none fixed inset-0 z-[75] flex items-center justify-center p-4">
      <motion.button
        type="button"
        onClick={onDone}
        aria-label="Dismiss round update"
        initial={{ opacity: 0, scale: 0.85, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="pointer-events-auto w-full max-w-sm rounded-2xl border border-gray-200 bg-white/95 p-5 text-left shadow-2xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95"
      >
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          After round {round}
        </p>
        {hasShuffle(moment) || !firstStreak ? (
          <ShuffleCard moment={moment} round={round} playersById={playersById} />
        ) : (
          <StreakCard note={firstStreak} round={round} playersById={playersById} />
        )}
      </motion.button>
    </div>
  );
}
