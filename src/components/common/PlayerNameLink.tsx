'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Avatar from '@/components/common/Avatar';

interface PlayerStats {
  wins: number;
  totalMatches: number;
  averageRank: number;
  timesLeading: number;
  gamesWon: number;
  totalRounds: number;
}

interface PlayerNameLinkProps {
  userId: string;
  userName: string;
  displayName: string;
  className?: string;
  showPreview?: boolean;
}

export default function PlayerNameLink({
  userId,
  userName,
  displayName,
  className = '',
  showPreview = true,
}: PlayerNameLinkProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (!showPreview) return;
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
      if (!stats) {
        setLoading(true);
        fetch(`/api/users/${userName}/stats`)
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            if (data?.stats) setStats(data.stats);
            if (data?.profilePicUrl) setProfilePicUrl(data.profilePicUrl);
          })
          .finally(() => setLoading(false));
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTooltip(false);
  };

  return (
    <div className="relative inline-block" onMouseLeave={handleMouseLeave}>
      <Link
        href={`/profile/${userName}`}
        className={`hover:underline cursor-pointer ${className}`}
        onMouseEnter={handleMouseEnter}
      >
        {displayName}
      </Link>

      {showPreview && showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-50 left-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 pointer-events-auto"
          onMouseEnter={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setShowTooltip(true);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {loading && stats === null ? (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : stats ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-3">
                <Avatar
                  name={displayName}
                  profilePicUrl={profilePicUrl}
                  size={40}
                  fallbackClassName="bg-blue-600 text-white"
                />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">@{userName}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-500 flex items-center justify-center">
                    {stats.wins}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Wins</p>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    {stats.gamesWon}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Games Won</p>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    {stats.averageRank.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avg Rank</p>
                </div>
              </div>

              <Link
                href={`/profile/${userName}`}
                className="block text-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition"
                onClick={() => setShowTooltip(false)}
              >
                View Profile
              </Link>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Could not load stats</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
