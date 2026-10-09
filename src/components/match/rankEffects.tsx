'use client';

import { AnimatePresence, motion, type Transition } from 'framer-motion';
import { ArrowDown, ArrowUp, Crown } from 'lucide-react';
import type { RankChange, RankChanges } from '@/lib/domain/rankChanges';
import type { PlayersById } from '@/types';

export const RANK_SPRING: Transition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 };

const POP_SPRING: Transition = { type: 'spring', stiffness: 520, damping: 24 };

const AFTER_SWAP_DELAY_S = 0.25;

export const PODIUM_ENTER_EXIT = {
  initial: { opacity: 0, scale: 0.6, y: 28 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.6, y: 28 },
};

export type GameStreaksByPlayer = ReadonlyMap<string, number>;

export interface PodiumEntry {
  playerId: string;
  position: number;
  name: string;
  total: number;
  isDnf: boolean;
  isSharedPosition: boolean;
  isLast: boolean;
}

export interface PodiumProps {
  entries: PodiumEntry[];
  playersById: PlayersById;
  changes: RankChanges;
  gameStreaks?: GameStreaksByPlayer;
}

export function hasMoved(change: RankChange | undefined): change is RankChange {
  return !!change && (change.delta !== 0 || change.isNewLeader);
}

export function TiedLabel({ className }: { className: string }) {
  return <span className={className}>(tied)</span>;
}

interface RankDeltaChipProps {
  change: RankChange | undefined;
  className?: string;
}

export function RankDeltaChip({ change, className = '' }: RankDeltaChipProps) {
  const delta = change?.delta ?? 0;
  const climbed = delta > 0;
  const Arrow = climbed ? ArrowUp : ArrowDown;
  const steps = Math.abs(delta);

  return (
    <AnimatePresence>
      {delta !== 0 && (
        <motion.span
          key={`${change?.from}-${change?.to}`}
          initial={{ opacity: 0, scale: 0.4, y: climbed ? 8 : -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ ...POP_SPRING, delay: AFTER_SWAP_DELAY_S }}
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none shadow-sm ${
            climbed
              ? 'bg-emerald-500 text-white dark:bg-emerald-400 dark:text-emerald-950'
              : 'bg-rose-500 text-white dark:bg-rose-400 dark:text-rose-950'
          } ${className}`}
        >
          <Arrow className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
          <span aria-hidden="true">{climbed ? `+${steps}` : steps}</span>
          <span className="sr-only">
            {`${climbed ? 'up' : 'down'} ${steps} ${steps === 1 ? 'place' : 'places'}`}
          </span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

interface LeaderCrownProps {
  celebrate?: boolean;
  delay?: number;
  className?: string;
}

export function LeaderCrown({ celebrate = false, delay = 0, className = 'h-5 w-5' }: LeaderCrownProps) {
  return (
    <motion.span
      className="inline-flex text-yellow-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] dark:text-yellow-400"
      initial={{ scale: 0, rotate: -35, opacity: 0 }}
      animate={
        celebrate
          ? { scale: [0, 1.35, 1], rotate: [-35, 12, 0], opacity: 1 }
          : { scale: 1, rotate: 0, opacity: 1 }
      }
      transition={celebrate ? { duration: 0.6, delay, ease: 'easeOut' } : { ...POP_SPRING, delay }}
      aria-hidden="true"
    >
      <Crown className={className} fill="currentColor" />
    </motion.span>
  );
}

const GLOW_OFF = '0 0 0 0 rgba(250, 204, 21, 0)';
const GLOW_ON = '0 0 28px 6px rgba(250, 204, 21, 0.55)';

export function NewLeaderShine({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      initial={{ boxShadow: GLOW_OFF }}
      animate={{ boxShadow: [GLOW_OFF, GLOW_ON, GLOW_OFF] }}
      transition={{ duration: 1.6, delay: AFTER_SWAP_DELAY_S, ease: 'easeInOut' }}
    >
      <motion.span
        className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/30"
        initial={{ x: '0%' }}
        animate={{ x: '400%' }}
        transition={{ duration: 0.9, delay: AFTER_SWAP_DELAY_S + 0.15, ease: 'easeInOut' }}
      />
    </motion.span>
  );
}

export function MovedRowFlash({ change }: { change: RankChange | undefined }) {
  if (!hasMoved(change)) return null;
  const tint =
    change.delta >= 0
      ? 'bg-emerald-400/30 dark:bg-emerald-400/20'
      : 'bg-rose-400/30 dark:bg-rose-400/20';
  return (
    <motion.span
      key={`${change.from}-${change.to}`}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[inherit] ${tint}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 1.4, delay: AFTER_SWAP_DELAY_S, times: [0, 0.2, 1] }}
    />
  );
}
