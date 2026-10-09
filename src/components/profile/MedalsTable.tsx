'use client';

import { Trophy, Crown, Medal, Swords, ListOrdered, Gauge, Percent } from 'lucide-react';
import type { ReactNode } from 'react';
import MedalIconRow from '@/components/profile/MedalIconRow';
import RatingPanel from '@/components/profile/RatingPanel';
import { formatWinPct } from '@/lib/domain/ratingTier';
import type { UserStats } from '@/lib/queries/users';

interface MedalsTableProps {
  stats?: UserStats;
  username?: string;
}

const STARTING_RATING = 1200;

const EMPTY_STREAKS: UserStats['streaks'] = {
  longestGameStreak: 0,
  currentGameStreak: 0,
  gameStreakCounts: { 3: 0, 4: 0, 5: 0, 6: 0 },
  longestMatchStreak: 0,
  currentMatchStreak: 0,
  longestDayStreak: 0,
  currentDayStreak: 0,
};

const EMPTY_STATS: UserStats = {
  rating: STARTING_RATING,
  peakRating: STARTING_RATING,
  ratedMatches: 0,
  matchesPlayed: 0,
  matchWins: 0,
  podiums: { first: 0, second: 0, third: 0 },
  gamesWon: 0,
  gamesPlayed: 0,
  winPct: 0,
  averageRank: 0,
  globalRank: null,
  streaks: EMPTY_STREAKS,
  milestones: [],
  wins: 0,
  totalMatches: 0,
  totalRounds: 0,
};

const CARD_BASE_CLASSES =
  'rounded-xl p-4 text-center border transition duration-200 hover:-translate-y-0.5 hover:shadow-md';

interface StatTileProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  toneClasses: string;
  valueClassName: string;
}

function StatTile({ label, value, icon, toneClasses, valueClassName }: StatTileProps) {
  return (
    <div className={`${CARD_BASE_CLASSES} ${toneClasses}`}>
      <div className={`text-2xl sm:text-3xl font-bold flex items-center justify-center gap-1.5 ${valueClassName}`}>
        {value}
        {icon}
      </div>
      <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}

interface TrophyShelfProps {
  title: string;
  count: number;
  children: ReactNode;
  toneClasses: string;
}

function TrophyShelf({ title, count, children, toneClasses }: TrophyShelfProps) {
  return (
    <div className={`${CARD_BASE_CLASSES} text-left ${toneClasses}`}>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          {title}
        </p>
        <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{count}</span>
      </div>
      {children}
    </div>
  );
}

export default function MedalsTable({ stats = EMPTY_STATS, username }: MedalsTableProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
        Trophy Cabinet
      </h3>

      <RatingPanel stats={stats} username={username} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <TrophyShelf
          title="Match wins"
          count={stats.matchWins}
          toneClasses="border-yellow-200 dark:border-yellow-800/60 bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/30"
        >
          <MedalIconRow
            count={stats.matchWins}
            icon={Crown}
            iconClassName="text-yellow-500 fill-yellow-400"
            label="match wins"
          />
        </TrophyShelf>
        <TrophyShelf
          title="Game wins"
          count={stats.gamesWon}
          toneClasses="border-amber-200 dark:border-amber-800/60 bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/30"
        >
          <MedalIconRow
            count={stats.gamesWon}
            icon={Medal}
            iconClassName="text-yellow-500 fill-yellow-300"
            label="game wins"
          />
        </TrophyShelf>
        <TrophyShelf
          title="Silver & Bronze"
          count={stats.podiums.second + stats.podiums.third}
          toneClasses="border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-800/60"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Medal className="w-5 h-5 text-slate-400 fill-slate-300" />
              <span className="font-bold tabular-nums">{stats.podiums.second}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">silver</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Medal className="w-5 h-5 text-orange-500 fill-orange-400" />
              <span className="font-bold tabular-nums">{stats.podiums.third}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">bronze</span>
            </div>
          </div>
        </TrophyShelf>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label="Win %"
          value={formatWinPct(stats.winPct)}
          icon={<Percent className="w-4 h-4" />}
          toneClasses="border-green-200 dark:border-green-800/60 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40"
          valueClassName="text-green-600 dark:text-green-500"
        />
        <StatTile
          label="Matches"
          value={stats.matchesPlayed}
          icon={<Swords className="w-4 h-4" />}
          toneClasses="border-blue-200 dark:border-blue-800/60 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40"
          valueClassName="text-blue-600 dark:text-blue-500"
        />
        <StatTile
          label="Avg Rank"
          value={stats.averageRank.toFixed(1)}
          icon={<Gauge className="w-4 h-4" />}
          toneClasses="border-purple-200 dark:border-purple-800/60 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/40"
          valueClassName="text-purple-600 dark:text-purple-500"
        />
        <StatTile
          label="Games Played"
          value={stats.gamesPlayed}
          icon={<ListOrdered className="w-4 h-4" />}
          toneClasses="border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800"
          valueClassName="text-gray-600 dark:text-gray-400"
        />
      </div>
    </div>
  );
}
