'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useUIStore } from '@/lib/store/uiStore';

const GLOW_DURATION_S = 2.4;
const GLOW_KEYFRAME_TIMES = [0, 0.12, 0.55, 1];
const HEX_ALPHA_SOFT = '40';
const HEX_ALPHA_CLEAR = '00';

function glowShadow(color: string, spreadPx: number, blurPx: number, alpha: string): string {
  return `0 0 0 2px ${color}, 0 0 ${blurPx}px ${spreadPx}px ${color}${alpha}`;
}

export default function ProfileGlow() {
  const pulse = useUIStore((state) => state.profilePulse);
  const reduceMotion = useReducedMotion();
  if (!pulse) return null;

  const { color } = pulse;

  return (
    <motion.span
      key={pulse.id}
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-full"
      initial={{ opacity: 0, scale: 0.92, boxShadow: glowShadow(color, 0, 0, HEX_ALPHA_SOFT) }}
      animate={
        reduceMotion
          ? { opacity: [0, 1, 1, 0], scale: 1, boxShadow: glowShadow(color, 6, 18, HEX_ALPHA_SOFT) }
          : {
              opacity: [0, 1, 1, 0],
              scale: [0.92, 1.12, 1.02, 1],
              boxShadow: [
                glowShadow(color, 0, 0, HEX_ALPHA_SOFT),
                glowShadow(color, 10, 26, HEX_ALPHA_SOFT),
                glowShadow(color, 6, 18, HEX_ALPHA_SOFT),
                glowShadow(color, 0, 8, HEX_ALPHA_CLEAR),
              ],
            }
      }
      transition={{ duration: GLOW_DURATION_S, times: GLOW_KEYFRAME_TIMES, ease: 'easeOut' }}
      style={{ backgroundColor: `${color}26` }}
    />
  );
}
