'use client';

import { Card, isRedSuit, RANK_LABEL, SUIT_NAME, SUIT_SYMBOL } from '@/lib/cards/card';

type CardSize = 'grid' | 'chip';

interface PlayingCardProps {
  card: Card;
  size?: CardSize;
  /** How many copies are held. Two decks are in play, so 2 is legal. */
  count?: number;
  onClick?: () => void;
  disabled?: boolean;
  /** Dims the face without removing it — used for cards spoken for elsewhere. */
  muted?: boolean;
}

/**
 * A playing card drawn in CSS rather than with a glyph or an SVG package.
 *
 * The face stays white in both themes because that is what a card looks like,
 * and recognition beats theme purity here — you are matching this against real
 * cards in your hand. Only the surrounding chrome follows the theme.
 */
export default function PlayingCard({
  card,
  size = 'grid',
  count = 0,
  onClick,
  disabled = false,
  muted = false,
}: PlayingCardProps) {
  const selected = count > 0;
  const red = isRedSuit(card.suit);
  const label = `${RANK_LABEL[card.rank]} of ${SUIT_NAME[card.suit]}`;

  const sizing =
    size === 'grid'
      ? 'min-h-[46px] py-1.5 px-1 gap-0'
      : 'min-h-[34px] py-1 px-2 gap-1 flex-row items-baseline';

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick, disabled } : {})}
      aria-label={count > 1 ? `${label}, ${count} held` : label}
      aria-pressed={onClick ? selected : undefined}
      className={`relative flex flex-col items-center justify-center rounded-md border bg-white leading-none transition select-none ${sizing} ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-500 shadow-sm'
          : 'border-gray-300 dark:border-gray-500'
      } ${muted ? 'opacity-40' : ''} ${
        onClick && !disabled ? 'hover:border-blue-400 active:scale-95' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`font-bold ${size === 'grid' ? 'text-xs' : 'text-sm'} ${
          red ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {RANK_LABEL[card.rank]}
      </span>
      <span
        className={`${size === 'grid' ? 'text-base' : 'text-sm'} ${
          red ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {SUIT_SYMBOL[card.suit]}
      </span>

      {count > 1 && (
        <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {count}
        </span>
      )}
    </Tag>
  );
}
