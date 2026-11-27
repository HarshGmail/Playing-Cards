const GOLD_RING_START = '0 0 0 0 rgba(251, 191, 36, 0.95)';
const GOLD_RING_END = '0 0 0 14px rgba(251, 191, 36, 0)';

export function profileGlowMotion(): { initial: { boxShadow: string }; animate: { boxShadow: string } } {
  return { initial: { boxShadow: GOLD_RING_START }, animate: { boxShadow: GOLD_RING_END } };
}
