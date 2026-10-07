import { useCallback, useEffect, useState } from 'react';
import { CalendarView, isCalendarView, shiftAnchor, startOfDay } from '@/lib/domain/calendar';

const VIEW_STORAGE_KEY = 'calendar:view';
const PHONE_MEDIA_QUERY = '(max-width: 639px)';
const PHONE_DEFAULT_VIEW: CalendarView = 'list';
const DESKTOP_DEFAULT_VIEW: CalendarView = 'month';
const NOW_TICK_MS = 60_000;

export type NavigationDirection = -1 | 0 | 1;

function readStoredView(): CalendarView | null {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return isCalendarView(stored) ? stored : null;
  } catch {
    return null;
  }
}

function storeView(view: CalendarView) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    return;
  }
}

function isPhoneViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(PHONE_MEDIA_QUERY).matches;
}

export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(PHONE_MEDIA_QUERY);
    const sync = () => setIsPhone(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return isPhone;
}

export function useNow(tickMs: number = NOW_TICK_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(timer);
  }, [tickMs]);

  return now;
}

export function useCalendarNavigation() {
  const [view, setViewState] = useState<CalendarView | null>(null);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [direction, setDirection] = useState<NavigationDirection>(0);

  useEffect(() => {
    const fallback = isPhoneViewport() ? PHONE_DEFAULT_VIEW : DESKTOP_DEFAULT_VIEW;
    setViewState(readStoredView() ?? fallback);
  }, []);

  const setView = useCallback((next: CalendarView) => {
    setDirection(0);
    setViewState(next);
    storeView(next);
  }, []);

  const shift = useCallback(
    (step: 1 | -1) => {
      if (!view) return;
      setDirection(step);
      setAnchor((current) => shiftAnchor(view, current, step));
    },
    [view]
  );

  const goToday = useCallback(() => {
    const today = startOfDay(new Date());
    setDirection(Math.sign(today.getTime() - anchor.getTime()) as NavigationDirection);
    setAnchor(today);
  }, [anchor]);

  const openDay = useCallback(
    (day: Date) => {
      setAnchor(startOfDay(day));
      setView('day');
    },
    [setView]
  );

  return { view, anchor, direction, setView, shift, goToday, openDay };
}
