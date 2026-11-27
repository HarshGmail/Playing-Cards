'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import type { StatExplanation } from '@/lib/domain/statExplainers';
import StatFlipCard from './StatFlipCard';

interface StatCardTriggerProps {
  explanation: StatExplanation;
  className?: string;
  children: ReactNode;
}

export default function StatCardTrigger({ explanation, className = '', children }: StatCardTriggerProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${explanation.hint}. Tap to see how it's worked out.`}
        aria-haspopup="dialog"
        aria-label={`${explanation.title}: ${explanation.value}. Show what this means`}
        className={`group relative block w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${className}`}
      >
        {children}
        <Info
          aria-hidden
          className="absolute right-1.5 top-1.5 h-3.5 w-3.5 opacity-0 transition group-hover:opacity-60 group-focus-visible:opacity-60"
        />
      </button>
      {open && <StatFlipCard explanation={explanation} onClose={close} />}
    </>
  );
}
