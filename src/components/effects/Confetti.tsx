'use client';

import { useEffect } from 'react';
import type { Options } from 'canvas-confetti';

const CELEBRATION_COLORS = ['#a855f7', '#22c55e', '#eab308', '#3b82f6', '#f43f5e', '#ffffff'];
const SHOWER_DURATION_MS = 1600;
const SHOWER_FRAME_MS = 180;
const SECOND_POP_DELAY_MS = 250;

const SHARED_OPTIONS: Options = {
  colors: CELEBRATION_COLORS,
  disableForReducedMotion: true,
  zIndex: 60,
};

function popperFrom(corner: 'left' | 'right'): Options {
  const fromLeft = corner === 'left';
  return {
    ...SHARED_OPTIONS,
    particleCount: 70,
    angle: fromLeft ? 60 : 120,
    spread: 55,
    startVelocity: 62,
    gravity: 1,
    ticks: 260,
    origin: { x: fromLeft ? 0 : 1, y: 1 },
  };
}

function showerPiece(): Options {
  return {
    ...SHARED_OPTIONS,
    particleCount: 14,
    angle: 270,
    spread: 120,
    startVelocity: 12,
    gravity: 0.7,
    ticks: 320,
    scalar: 0.9,
    origin: { x: Math.random(), y: -0.05 },
  };
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function fireConfetti(): Promise<() => void> {
  const noop = () => undefined;
  if (typeof window === 'undefined' || prefersReducedMotion()) return noop;

  const { default: confetti } = await import('canvas-confetti');
  const timers: ReturnType<typeof setTimeout>[] = [];

  const popBothCorners = () => {
    confetti(popperFrom('left'));
    confetti(popperFrom('right'));
  };

  popBothCorners();
  timers.push(setTimeout(popBothCorners, SECOND_POP_DELAY_MS));

  const showerEndsAt = Date.now() + SHOWER_DURATION_MS;
  const shower = setInterval(() => {
    if (Date.now() > showerEndsAt) {
      clearInterval(shower);
      return;
    }
    confetti(showerPiece());
  }, SHOWER_FRAME_MS);

  return () => {
    timers.forEach(clearTimeout);
    clearInterval(shower);
    confetti.reset();
  };
}

interface ConfettiProps {
  active: boolean;
  delayMs?: number;
}

export default function Confetti({ active, delayMs = 0 }: ConfettiProps) {
  useEffect(() => {
    if (!active) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    const start = setTimeout(() => {
      fireConfetti().then((cleanup) => {
        if (cancelled) cleanup();
        else stop = cleanup;
      });
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(start);
      stop?.();
    };
  }, [active, delayMs]);

  return null;
}
