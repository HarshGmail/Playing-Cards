'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Medal } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import {
  LeaderCrown,
  NewLeaderShine,
  PODIUM_ENTER_EXIT,
  RANK_SPRING,
  RankDeltaChip,
  TiedLabel,
  type PodiumProps,
} from '@/components/match/rankEffects';

interface BlockStyle {
  order: string;
  heightPx: number;
  avatarPx: number;
  riseDelayS: number;
  block: string;
  icon: JSX.Element | null;
}

const WINNER_CROWN_DELAY_S = 1.1;

const BLOCK_STYLES: Record<number, BlockStyle> = {
  1: {
    order: 'order-2',
    heightPx: 160,
    avatarPx: 60,
    riseDelayS: 0.6,
    block: 'bg-gradient-to-b from-purple-500 to-purple-700 text-white',
    icon: null,
  },
  2: {
    order: 'order-1',
    heightPx: 112,
    avatarPx: 40,
    riseDelayS: 0.3,
    block: 'bg-gradient-to-b from-green-500 to-green-700 text-white',
    icon: <Medal className="w-6 h-6 text-gray-400" />,
  },
  3: {
    order: 'order-3',
    heightPx: 80,
    avatarPx: 40,
    riseDelayS: 0,
    block: 'bg-gradient-to-b from-yellow-500 to-yellow-700 text-white',
    icon: <Medal className="w-6 h-6 text-yellow-700" />,
  },
};

const BLOCK_RISE_SPRING = { type: 'spring', stiffness: 170, damping: 20 } as const;

function useHasMounted() {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  return mounted.current;
}

export default function Podium({ entries, playersById, changes }: PodiumProps) {
  const hasMounted = useHasMounted();
  const prefersReducedMotion = useReducedMotion();
  const ceremonyDone = hasMounted || !!prefersReducedMotion;

  return (
    <div className="relative flex items-end justify-center gap-2 py-4 sm:gap-3">
      <AnimatePresence mode="popLayout">
        {entries.map((entry) => {
          const style = BLOCK_STYLES[entry.position];
          if (!style) return null;
          const change = changes.get(entry.playerId);
          const isWinner = entry.position === 1;
          const riseDelay = ceremonyDone ? 0 : style.riseDelayS;
          return (
            <motion.div
              key={entry.playerId}
              layout="position"
              {...PODIUM_ENTER_EXIT}
              initial={hasMounted ? PODIUM_ENTER_EXIT.initial : false}
              transition={RANK_SPRING}
              className={`relative flex flex-col items-center w-24 sm:w-28 ${style.order}`}
            >
              <motion.div
                className="flex flex-col items-center w-full"
                initial={ceremonyDone ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: riseDelay + 0.25 }}
              >
                {isWinner ? (
                  <LeaderCrown
                    celebrate
                    delay={ceremonyDone ? 0.25 : WINNER_CROWN_DELAY_S}
                    className="w-8 h-8"
                  />
                ) : (
                  style.icon
                )}
                <span className="relative mt-1">
                  <RankDeltaChip change={change} className="absolute -right-3 -top-1 z-10" />
                  <Avatar
                    name={entry.name}
                    profilePicUrl={playersById[entry.playerId]?.profilePicUrl}
                    size={style.avatarPx}
                    className={
                      isWinner
                        ? 'ring-4 ring-yellow-400/80 dark:ring-yellow-300/70 shadow-lg shadow-yellow-500/30'
                        : ''
                    }
                  />
                </span>
                <p className="font-semibold text-gray-900 dark:text-white text-center truncate w-full mt-1">
                  {entry.name}
                  {entry.isSharedPosition && (
                    <TiedLabel className="text-xs text-gray-500 dark:text-gray-400 ml-1" />
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 tabular-nums">
                  {entry.total}
                </p>
              </motion.div>
              <motion.div
                className={`relative w-full overflow-hidden ${style.block} rounded-t-lg flex items-start justify-center pt-2 text-2xl font-bold shadow-inner`}
                initial={ceremonyDone ? false : { height: 0 }}
                animate={{ height: style.heightPx }}
                transition={{ ...BLOCK_RISE_SPRING, delay: riseDelay }}
              >
                <NewLeaderShine active={!!change?.isNewLeader} />
                {entry.position}
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
