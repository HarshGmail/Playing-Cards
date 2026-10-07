import type { LucideIcon } from 'lucide-react';

const MAX_VISIBLE_ICONS = 10;

interface MedalIconRowProps {
  count: number;
  icon: LucideIcon;
  iconClassName: string;
  label: string;
}

export function splitVisibleCount(count: number, maxVisible: number = MAX_VISIBLE_ICONS) {
  const visible = Math.min(count, maxVisible);
  return { visible, overflow: count - visible };
}

export default function MedalIconRow({ count, icon: Icon, iconClassName, label }: MedalIconRowProps) {
  const { visible, overflow } = splitVisibleCount(count);

  if (count === 0) {
    return <p className="text-xs text-gray-400 dark:text-gray-500">None yet</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1" role="img" aria-label={`${count} ${label}`}>
      {Array.from({ length: visible }, (_, index) => (
        <Icon key={index} className={`w-5 h-5 ${iconClassName}`} />
      ))}
      {overflow > 0 && (
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">+{overflow}</span>
      )}
    </div>
  );
}
