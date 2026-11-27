'use client';

import type { CardSuit, StatExplanation } from '@/lib/domain/statExplainers';
import FlipCardModal, { CARD_FACE_STYLE } from './FlipCardModal';

const STAT_TITLE_ID = 'stat-card-title';
const RED_SUITS = new Set<CardSuit>(['♥', '♦']);

function suitClass(suit: CardSuit): string {
  return RED_SUITS.has(suit) ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white';
}

function CornerIndex({ explanation, flipped }: { explanation: StatExplanation; flipped?: boolean }) {
  return (
    <div
      aria-hidden
      className={`absolute flex flex-col items-center leading-none ${suitClass(explanation.suit)} ${
        flipped ? 'bottom-3 right-3 rotate-180' : 'left-3 top-3'
      }`}
    >
      <span className="text-[11px] font-black tabular-nums">{explanation.value}</span>
      <span className="text-lg">{explanation.suit}</span>
    </div>
  );
}

interface StatFlipCardProps {
  explanation: StatExplanation;
  onClose: () => void;
}

export default function StatFlipCard({ explanation, onClose }: StatFlipCardProps) {
  return (
    <FlipCardModal titleId={STAT_TITLE_ID} onClose={onClose}>
      <div
        style={CARD_FACE_STYLE}
        className="absolute inset-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <CornerIndex explanation={explanation} />
        <CornerIndex explanation={explanation} flipped />
        <div className="flex h-full flex-col gap-3 overflow-y-auto px-8 py-9 text-gray-900 dark:text-white">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {explanation.scope}
            </p>
            <h2 id={STAT_TITLE_ID} className="mt-1 text-lg font-extrabold">
              {explanation.title}
            </h2>
            <p className={`mt-1 text-5xl font-black tabular-nums ${suitClass(explanation.suit)}`}>
              {explanation.value}
            </p>
          </div>
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{explanation.meaning}</p>
          {explanation.calculation && (
            <div className="rounded-xl bg-violet-50 px-3 py-2 dark:bg-violet-900/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                How it&apos;s worked out
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-violet-950 dark:text-violet-100">
                {explanation.calculation}
              </p>
            </div>
          )}
          {explanation.detail && (
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{explanation.detail}</p>
          )}
        </div>
      </div>
    </FlipCardModal>
  );
}
