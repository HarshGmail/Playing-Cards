'use client';

import { useState, useRef, useEffect, type MouseEvent as ReactMouseEvent } from 'react';
import Link from 'next/link';
import Avatar from '@/components/common/Avatar';
import { formatWinPct } from '@/lib/domain/ratingTier';
import type { UserStats } from '@/lib/queries/users';

const HOVER_PREVIEW_DELAY_MS = 300;
const TOUCH_DEVICE_QUERY = '(hover: none)';

function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(TOUCH_DEVICE_QUERY);
    setIsTouch(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setIsTouch(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return isTouch;
}

interface PlayerNameLinkProps {
  userId: string;
  /** The handle, not the display name — used for the link and the stats fetch. */
  userName: string;
  displayName: string;
  /**
   * Known picture, when the caller has one. Avoids waiting for the hover fetch,
   * and is the only source for players whose stats request hasn't run.
   */
  profilePicUrl?: string | null;
  /** Rendered avatar size in px. Small by default to suit dense table rows. */
  avatarSize?: number;
  /** Opt out where a layout has no room for it. */
  showAvatar?: boolean;
  /**
   * Stack the avatar above the name instead of beside it. For narrow vertical
   * containers like the scoreboard's per-player column headers, where an inline
   * avatar forces the column wider or wraps the name.
   */
  stacked?: boolean;
  className?: string;
  showPreview?: boolean;
}

export default function PlayerNameLink({
  userId,
  userName,
  displayName,
  profilePicUrl,
  avatarSize = 24,
  showAvatar = true,
  stacked = false,
  className = '',
  showPreview = true,
}: PlayerNameLinkProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [fetchedPicUrl, setFetchedPicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const isTouchDevice = useIsTouchDevice();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // `userName` must be the handle, but callers reach for the display name because
  // RosterEntry stores that under `userName` too — and both are `string`, so the
  // type system cannot tell them apart. A handle never contains whitespace, so
  // this catches the mix-up instead of letting it degrade quietly into a 404
  // stats fetch and a /profile/<Display Name> link.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && /\s/.test(userName)) {
      console.warn(
        `PlayerNameLink: userName="${userName}" contains whitespace, so it looks ` +
          `like a display name rather than a handle. Profile links and the hover ` +
          `preview will both break. Pass the username from the joined roster.`
      );
    }
  }, [userName]);

  const loadStats = () => {
    if (stats) return;
    setLoading(true);
    fetch(`/api/users/${userName}/stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.stats) setStats(data.stats);
        if (data?.profilePicUrl) setFetchedPicUrl(data.profilePicUrl);
      })
      .finally(() => setLoading(false));
  };

  const handleMouseEnter = () => {
    if (!showPreview || isTouchDevice) return;
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
      loadStats();
    }, HOVER_PREVIEW_DELAY_MS);
  };

  const closePreview = () => setShowTooltip(false);

  const handleAvatarClick = (event: ReactMouseEvent) => {
    if (!showPreview || !isTouchDevice) return;
    event.preventDefault();
    event.stopPropagation();
    if (showTooltip) {
      closePreview();
      return;
    }
    setShowTooltip(true);
    loadStats();
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTooltip(false);
  };

  useEffect(() => {
    if (!showTooltip) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePreview();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showTooltip]);

  // Prefer what the caller passed; fall back to whatever the hover fetch found.
  const picUrl = profilePicUrl ?? fetchedPicUrl;

  return (
    <div className="relative inline-block" onMouseLeave={handleMouseLeave}>
      {/* Avatar sits inside the Link so the picture and name are one click
          target that navigates to the profile, rather than two behaviours in the
          same table cell. */}
      <Link
        href={`/profile/${userName}`}
        className={`inline-flex align-middle hover:underline cursor-pointer ${
          stacked ? 'flex-col items-center gap-1' : 'items-center gap-1.5'
        } ${className}`}
        onMouseEnter={handleMouseEnter}
      >
        {showAvatar && (
          <span className="inline-flex" onClick={handleAvatarClick}>
            <Avatar
              name={displayName}
              profilePicUrl={picUrl}
              size={avatarSize}
              fallbackClassName="bg-blue-600 text-white"
            />
          </span>
        )}
        {displayName}
      </Link>

      {showPreview && showTooltip && isTouchDevice && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={closePreview}
          aria-hidden="true"
        />
      )}

      {showPreview && showTooltip && (
        <div
          ref={tooltipRef}
          role="dialog"
          aria-label={`${displayName} stats`}
          className={
            isTouchDevice
              ? 'fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-gray-700 p-5 pb-8'
              : 'absolute z-50 left-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 pointer-events-auto'
          }
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
                  profilePicUrl={picUrl}
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
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    {Math.round(stats.rating)}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rating</p>
                </div>
                <div>
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-500 flex items-center justify-center">
                    {stats.matchWins}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Match wins</p>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400 flex items-center justify-center">
                    {formatWinPct(stats.winPct)}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Win %</p>
                </div>
              </div>

              <Link
                href={`/profile/${userName}`}
                className="block text-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition"
                onClick={closePreview}
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
