'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

const FLIP_DELAY_S = 0.35;
const FLIP_DURATION_S = 0.75;
const FLIP_EASE = [0.4, 0, 0.2, 1] as const;
const CARD_BACK_SUITS = ['♠', '♥', '♦', '♣'];
const CARD_BACK_PATTERN_SIZE = 48;
export const HIDDEN_BACKFACE = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' } as const;
export const CARD_FACE_STYLE = { ...HIDDEN_BACKFACE, transform: 'rotateY(180deg)' } as const;

function CardBack() {
  return (
    <div
      aria-hidden
      style={HIDDEN_BACKFACE}
      className="absolute inset-0 overflow-hidden rounded-2xl border-[6px] border-white bg-gradient-to-br from-violet-600 to-violet-900 shadow-2xl"
    >
      <div className="absolute inset-2 grid grid-cols-6 place-items-center overflow-hidden rounded-xl border-2 border-white/30 text-lg text-white/15">
        {Array.from({ length: CARD_BACK_PATTERN_SIZE }, (_, index) => (
          <span key={index}>{CARD_BACK_SUITS[index % CARD_BACK_SUITS.length]}</span>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <img src="/icon.svg" alt="" className="h-20 w-20 rounded-2xl shadow-lg ring-4 ring-white/80" />
        <p className="text-sm font-black uppercase tracking-[0.25em] text-white">Playing Cards</p>
      </div>
    </div>
  );
}

interface FlipCardModalProps {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}

export default function FlipCardModal({ titleId, onClose, children }: FlipCardModalProps) {
  const reduceMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      role="presentation"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="relative"
        style={{ perspective: 1200 }}
      >
        <motion.div
          className="relative aspect-[5/7] w-[min(82vw,300px)]"
          style={{ transformStyle: 'preserve-3d' }}
          initial={reduceMotion ? { rotateY: 180 } : { rotateY: 0, scale: 0.8, y: 40 }}
          animate={{ rotateY: 180, scale: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  rotateY: { delay: FLIP_DELAY_S, duration: FLIP_DURATION_S, ease: FLIP_EASE },
                  scale: { type: 'spring', stiffness: 260, damping: 22 },
                  y: { type: 'spring', stiffness: 260, damping: 22 },
                }
          }
        >
          <CardBack />
          {children}
        </motion.div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-3 -top-3 rounded-full bg-white p-1.5 text-gray-800 shadow-lg transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </motion.div>,
    document.body
  );
}
