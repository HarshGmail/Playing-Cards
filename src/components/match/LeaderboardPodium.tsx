'use client';

import { getPositionColor } from '@/lib/domain/positionColor';
import { POSITION_CLASSES } from '@/components/match/positionClasses';
import Podium from '@/components/match/Podium';
import PlayerNameLink from '@/components/common/PlayerNameLink';
import type { PlayersById } from '@/types';

interface PodiumEntry {
  position: number;
  playerId: string;
  name: string;
  total: number;
  isDnf: boolean;
  isSharedPosition: boolean;
  isLast: boolean;
}

interface LeaderboardPodiumProps {
  /** Top three active entries, already sliced by the caller. */
  entries: PodiumEntry[];
  playersById: PlayersById;
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
  ended = false,
}: LeaderboardPodiumProps) {
  if (entries.length === 0) return null;

  if (ended) {
    return <Podium entries={entries} playersById={playersById} />;
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-2 md:gap-4">
      {entries.map((entry) => {
        const colors = POSITION_CLASSES[getPositionColor(entry.position, entry.isLast, entry.isDnf)];
        return (
          <div
            key={entry.playerId}
            className={`bg-gradient-to-br rounded-lg border p-4 text-center ${colors.ring}`}
          >
            <div className={`font-bold text-2xl ${colors.text}`}>
              #{entry.position}
              {entry.isSharedPosition && <span className="text-sm ml-1">(tied)</span>}
            </div>
            <p className="font-semibold text-gray-900 dark:text-white mt-1">
              <PlayerNameLink
                userId={entry.playerId}
                userName={playersById[entry.playerId]?.username ?? ''}
                displayName={entry.name}
                profilePicUrl={playersById[entry.playerId]?.profilePicUrl}
                avatarSize={32}
                stacked
                className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
              />
            </p>
            <p className={`font-bold text-lg mt-1 ${colors.text}`}>{entry.total}</p>
          </div>
        );
      })}
    </div>
  );
}
