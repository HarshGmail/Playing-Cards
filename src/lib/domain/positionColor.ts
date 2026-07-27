export type PositionColorToken =
  | 'pos-1'
  | 'pos-2'
  | 'pos-3'
  | 'pos-last'
  | 'pos-mid'
  | 'pos-dnf';

export function getPositionColor(
  position: number,
  isLast: boolean,
  isDnf: boolean
): PositionColorToken {
  if (isDnf) return 'pos-dnf';
  if (position === 1) return 'pos-1';
  if (position === 2) return 'pos-2';
  if (position === 3) return 'pos-3';
  if (isLast) return 'pos-last';
  return 'pos-mid';
}
