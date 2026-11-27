'use client';

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { fireConfetti } from '@/components/effects/Confetti';
import { celebrationFor, unseenMilestonesFrom, type UnseenMilestone } from '@/lib/domain/milestoneCelebration';
import { useMarkAsReadMutation, useNotificationsQuery } from '@/lib/queries/notifications';
import { useUIStore } from '@/lib/store/uiStore';
import { MILESTONE_THEMES } from './milestoneStyles';

const PROFILE_TARGET_SELECTOR = '[data-milestone-target="profile"]';
const ENTRANCE = { type: 'spring', stiffness: 360, damping: 26 } as const;
const FLIGHT_DURATION_S = 0.7;
const FLIGHT_EASE = [0.55, 0, 0.35, 1] as const;
const MIN_FLIGHT_SCALE = 0.08;
const FALLBACK_FLIGHT = { x: 0, y: -120, scale: 0.6 };
const MATCH_PAGE_PREFIX = '/matches/';

interface Flight {
  notificationId: string;
  x: number;
  y: number;
  scale: number;
}

function visibleProfileTarget(): DOMRect | null {
  const targets = Array.from(document.querySelectorAll<HTMLElement>(PROFILE_TARGET_SELECTOR));
  const visible = targets.find((el) => el.getBoundingClientRect().width > 0);
  return visible ? visible.getBoundingClientRect() : null;
}

function flightPath(from: DOMRect | undefined, to: DOMRect | null): Omit<Flight, 'notificationId'> {
  if (!from || !to) return FALLBACK_FLIGHT;
  return {
    x: to.left + to.width / 2 - (from.left + from.width / 2),
    y: to.top + to.height / 2 - (from.top + from.height / 2),
    scale: Math.max(MIN_FLIGHT_SCALE, to.height / from.height),
  };
}

function usePopConfetti(key: string | undefined) {
  useEffect(() => {
    if (!key) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    fireConfetti().then((cancel) => {
      if (cancelled) cancel();
      else stop = cancel;
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [key]);
}

interface BannerCardProps {
  item: UnseenMilestone;
  position: number;
  remaining: number;
  flight: Flight | null;
  onFlown: () => void;
}

const BannerCard = forwardRef<HTMLDivElement, BannerCardProps>(function BannerCard(
  { item, position, remaining, flight, onFlown },
  ref
) {
  const reduceMotion = useReducedMotion();
  const { milestone } = item;
  const { headline, cheer } = celebrationFor(milestone, position);
  const theme = MILESTONE_THEMES[milestone.color];
  usePopConfetti(item.notificationId);

  const flyingTarget = reduceMotion
    ? { opacity: 0, scale: 0.96 }
    : { x: flight?.x, y: flight?.y, scale: flight?.scale, opacity: [1, 1, 0.85] };

  return (
    <motion.div
      ref={ref}
      role="status"
      initial={reduceMotion ? false : { y: -140, opacity: 0, scale: 0.9 }}
      animate={flight ? flyingTarget : { x: 0, y: 0, opacity: 1, scale: 1 }}
      transition={flight ? { duration: reduceMotion ? 0.2 : FLIGHT_DURATION_S, ease: FLIGHT_EASE } : ENTRANCE}
      onAnimationComplete={() => {
        if (flight) onFlown();
      }}
      className={`pointer-events-none relative flex w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl p-3 pr-4 shadow-2xl ring-2 ring-white/40 ${theme.card}`}
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
      {remaining > 1 && (
        <span className="shrink-0 self-start rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-semibold tabular-nums">
          +{remaining - 1} more
        </span>
      )}
    </motion.div>
  );
});

interface MilestoneCelebrationBannerProps {
  enabled: boolean;
}

export default function MilestoneCelebrationBanner({ enabled }: MilestoneCelebrationBannerProps) {
  const pathname = usePathname();
  const isOnMatchPage = pathname?.startsWith(MATCH_PAGE_PREFIX) ?? false;
  const { data: notifications } = useNotificationsQuery(enabled);
  const markAsRead = useMarkAsReadMutation();
  const pulseProfile = useUIStore((state) => state.pulseProfile);
  const cardRef = useRef<HTMLDivElement>(null);
  const [collectedIds, setCollectedIds] = useState<string[]>([]);
  const [collectedCount, setCollectedCount] = useState(0);
  const [flight, setFlight] = useState<Flight | null>(null);

  const queue = useMemo(
    () =>
      unseenMilestonesFrom(notifications ?? []).filter(
        (item) => !collectedIds.includes(item.notificationId)
      ),
    [notifications, collectedIds]
  );
  const current = enabled && !isOnMatchPage ? queue[0] ?? null : null;
  const isLastOne = queue.length <= 1;

  const collect = useCallback(() => {
    if (!current || flight) return;
    const path = flightPath(cardRef.current?.getBoundingClientRect(), visibleProfileTarget());
    setFlight({ notificationId: current.notificationId, ...path });
  }, [current, flight]);

  const land = () => {
    if (!current) return;
    pulseProfile(MILESTONE_THEMES[current.milestone.color].glow);
    markAsRead.mutate(current.notificationId);
    setCollectedIds((ids) => [...ids, current.notificationId]);
    setCollectedCount((count) => count + 1);
    setFlight(null);
  };

  useEffect(() => {
    if (!current) return;
    const collectOnKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') collect();
    };
    window.addEventListener('keydown', collectOnKey);
    return () => window.removeEventListener('keydown', collectOnKey);
  }, [current, collect]);

  if (!current) return null;

  const backdropFading = flight !== null && isLastOne;

  return (
    <>
      <motion.button
        type="button"
        aria-label={`Add ${current.milestone.title} to your profile`}
        onClick={collect}
        initial={{ opacity: 0 }}
        animate={{ opacity: backdropFading ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[35] cursor-pointer bg-gray-950/40 backdrop-blur-[2px] focus:outline-none"
      />
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-[65] flex flex-col items-center gap-2 px-4">
        <BannerCard
          key={current.notificationId}
          ref={cardRef}
          item={current}
          position={collectedCount}
          remaining={queue.length}
          flight={flight?.notificationId === current.notificationId ? flight : null}
          onFlown={land}
        />
        {!flight && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="rounded-full bg-gray-900/70 px-3 py-1 text-xs font-medium text-white"
          >
            Tap anywhere to add it to your profile
          </motion.p>
        )}
      </div>
    </>
  );
}
