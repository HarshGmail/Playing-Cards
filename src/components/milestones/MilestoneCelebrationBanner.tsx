'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { fireConfetti } from '@/components/effects/Confetti';
import { celebrationFor, unseenMilestonesFrom, type UnseenMilestone } from '@/lib/domain/milestoneCelebration';
import { useMarkAsReadMutation, useNotificationsQuery } from '@/lib/queries/notifications';
import { useUIStore } from '@/lib/store/uiStore';
import { MILESTONE_THEMES } from './milestoneStyles';

const PROFILE_TARGET_SELECTOR = '[data-milestone-target="profile"]';
const ENTRANCE = { type: 'spring', stiffness: 360, damping: 26 } as const;
const FLIGHT = { duration: 0.6, ease: [0.6, 0, 0.3, 1] } as const;

interface Flight {
  x: number;
  y: number;
}

function visibleProfileTarget(): DOMRect | null {
  const targets = Array.from(document.querySelectorAll<HTMLElement>(PROFILE_TARGET_SELECTOR));
  const visible = targets.find((el) => el.getBoundingClientRect().width > 0);
  return visible ? visible.getBoundingClientRect() : null;
}

function flightTo(from: DOMRect, to: DOMRect | null): Flight {
  if (!to) return { x: 0, y: -48 };
  return {
    x: to.left + to.width / 2 - (from.left + from.width / 2),
    y: to.top + to.height / 2 - (from.top + from.height / 2),
  };
}

function usePopConfetti(key: string | undefined) {
  useEffect(() => {
    if (!key) return;
    let stop: (() => void) | undefined;
    fireConfetti().then((cancel) => {
      stop = cancel;
    });
    return () => stop?.();
  }, [key]);
}

interface BannerCardProps {
  item: UnseenMilestone;
  position: number;
  remaining: number;
  onCollect: (item: UnseenMilestone, flight: Flight) => void;
  onFlown: (id: string) => void;
  flying: boolean;
}

function BannerCard({ item, position, remaining, onCollect, onFlown, flying }: BannerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { milestone } = item;
  const { headline, cheer } = celebrationFor(milestone, position);
  const theme = MILESTONE_THEMES[milestone.color];
  usePopConfetti(item.notificationId);

  const collect = () => {
    if (flying || !cardRef.current) return;
    onCollect(item, flightTo(cardRef.current.getBoundingClientRect(), visibleProfileTarget()));
  };

  return (
    <motion.div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={`${headline} ${milestone.title}. Tap to add it to your profile`}
      onClick={collect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          collect();
        }
      }}
      initial={reduceMotion ? false : { y: -140, opacity: 0, scale: 0.9 }}
      animate={flying ? { opacity: 0, scale: 0.25 } : { y: 0, opacity: 1, scale: 1 }}
      transition={flying ? FLIGHT : ENTRANCE}
      onAnimationComplete={() => {
        if (flying) onFlown(item.notificationId);
      }}
      exit={{ opacity: 0 }}
      className={`pointer-events-auto relative flex w-full max-w-md cursor-pointer items-center gap-3 overflow-hidden rounded-2xl p-3 pr-4 shadow-2xl ring-2 ring-amber-300/80 focus:outline-none focus-visible:ring-4 ${theme.card}`}
    >
      <div
        aria-hidden
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl ring-4 ${theme.heroBubble}`}
      >
        {milestone.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black uppercase tracking-wide">{headline}</p>
        <p className="truncate text-base font-extrabold leading-tight">{milestone.title}</p>
        <p className="truncate text-xs italic opacity-90">{cheer}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] font-semibold opacity-90">
        {remaining > 1 && (
          <span className="rounded-full bg-white/25 px-2 py-0.5 tabular-nums">+{remaining - 1} more</span>
        )}
        <span className="flex items-center gap-0.5">
          Tap <ChevronRight className="h-3 w-3" aria-hidden />
        </span>
      </div>
    </motion.div>
  );
}

interface MilestoneCelebrationBannerProps {
  enabled: boolean;
}

export default function MilestoneCelebrationBanner({ enabled }: MilestoneCelebrationBannerProps) {
  const { data: notifications } = useNotificationsQuery(enabled);
  const markAsRead = useMarkAsReadMutation();
  const pulseProfile = useUIStore((state) => state.pulseProfile);
  const [collectedIds, setCollectedIds] = useState<string[]>([]);
  const [flying, setFlying] = useState<{ id: string; flight: Flight } | null>(null);
  const [collectedCount, setCollectedCount] = useState(0);

  const queue = useMemo(
    () =>
      unseenMilestonesFrom(notifications ?? []).filter(
        (item) => !collectedIds.includes(item.notificationId)
      ),
    [notifications, collectedIds]
  );
  const current = queue[0] ?? null;

  const finishCollect = (id: string) => {
    setCollectedIds((ids) => [...ids, id]);
    setFlying(null);
    setCollectedCount((count) => count + 1);
    markAsRead.mutate(id);
    pulseProfile();
  };

  const handleCollect = (item: UnseenMilestone, flight: Flight) => {
    setFlying({ id: item.notificationId, flight });
  };

  if (!enabled || !current) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex justify-center px-4"
    >
      <AnimatePresence mode="popLayout">
        <BannerCard
          key={current.notificationId}
          item={current}
          position={collectedCount}
          remaining={queue.length}
          flying={flying?.id === current.notificationId}
          onCollect={handleCollect}
          onFlown={finishCollect}
        />
      </AnimatePresence>
    </div>
  );
}
