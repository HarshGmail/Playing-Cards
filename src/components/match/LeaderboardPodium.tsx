'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { getPositionColor } from '@/lib/domain/positionColor';
import { POSITION_CLASSES } from '@/components/match/positionClasses';
import Podium from '@/components/match/Podium';
import PlayerNameLink from '@/components/common/PlayerNameLink';
import {
  LeaderCrown,
  NewLeaderShine,
  PODIUM_ENTER_EXIT,
  RANK_SPRING,
  RankDeltaChip,
  TiedLabel,
  type PodiumProps,
} from '@/components/match/rankEffects';

interface LeaderboardPodiumProps extends PodiumProps {
  /** Finished matches get the stepped blocks; live ones get flat cards. */
  ended?: boolean;
}

/**
 * The top three, rendered above the leaderboard and rounds-won tables rather
 * than inside the leaderboard column — it reads as a summary of the match, so it
 * spans both tables and is centred with a max width instead of stretching to the
 * full page.
 */
export default function LeaderboardPodium({
  entries,
  playersById,
  changes,
  ended = false,
}: LeaderboardPodiumProps) {
  if (entries.length === 0) return null;

  if (ended) {
    return <Podium entries={entries} playersById={playersById} changes={changes} />;
  }

  return (
    <div className="relative mx-auto grid w-full max-w-3xl grid-cols-3 gap-2 pt-3 md:gap-4">
      <AnimatePresence mode="popLayout" initial={false}>
        {entries.map((entry) => {
          const colors = POSITION_CLASSES[getPositionColor(entry.position, entry.isLast, entry.isDnf)];
          const change = changes.get(entry.playerId);
          const isLeader = entry.position === 1;
          return (
            <motion.div
              key={entry.playerId}
              layout="position"
              {...PODIUM_ENTER_EXIT}
              transition={RANK_SPRING}
              className={`relative min-w-0 bg-gradient-to-br rounded-lg border p-3 text-center md:p-4 ${colors.ring}`}
            >
              <NewLeaderShine active={!!change?.isNewLeader} />
              {isLeader && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <LeaderCrown celebrate={!!change?.isNewLeader} className="h-6 w-6" />
                </span>
              )}
              <RankDeltaChip change={change} className="absolute right-1.5 top-1.5" />
              <motion.div layout="position" className={`font-bold text-xl md:text-2xl ${colors.text}`}>
                #{entry.position}
                {entry.isSharedPosition && <TiedLabel className="text-sm ml-1" />}
              </motion.div>
              <div className="font-semibold text-gray-900 dark:text-white mt-1 break-words">
                <PlayerNameLink
                  userId={entry.playerId}
                  userName={playersById[entry.playerId]?.username ?? ''}
                  displayName={entry.name}
                  profilePicUrl={playersById[entry.playerId]?.profilePicUrl}
                  avatarSize={32}
                  stacked
                  className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                />
              </div>
              <p className={`font-bold text-lg mt-1 tabular-nums ${colors.text}`}>{entry.total}</p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
