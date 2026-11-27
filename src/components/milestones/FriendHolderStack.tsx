import Avatar from '@/components/common/Avatar';
import type { MilestoneFriendHolder } from '@/types';

const MAX_SHOWN = 3;
const AVATAR_SIZE = 22;

interface FriendHolderStackProps {
  holders: MilestoneFriendHolder[];
  tone?: 'onColor' | 'muted';
}

function friendsLabel(count: number): string {
  return count === 1 ? '1 friend has it' : `${count} friends have it`;
}

export default function FriendHolderStack({ holders, tone = 'onColor' }: FriendHolderStackProps) {
  if (holders.length === 0) return null;
  const shown = holders.slice(0, MAX_SHOWN);
  const hiddenCount = holders.length - shown.length;
  const ring = tone === 'onColor' ? 'ring-white/70' : 'ring-white dark:ring-gray-800';
  const text = tone === 'onColor' ? 'opacity-90' : 'text-gray-500 dark:text-gray-400';

  return (
    <div className="flex items-center gap-2" aria-label={friendsLabel(holders.length)}>
      <div className="flex -space-x-1.5">
        {shown.map((holder) => (
          <Avatar
            key={holder.userId}
            name={holder.name}
            profilePicUrl={holder.profilePicUrl}
            size={AVATAR_SIZE}
            className={`ring-2 ${ring}`}
          />
        ))}
        {hiddenCount > 0 && (
          <span
            className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-gray-900/70 px-1 text-[10px] font-bold text-white ring-2 ${ring}`}
          >
            +{hiddenCount}
          </span>
        )}
      </div>
      <span className={`text-[11px] font-medium ${text}`}>{friendsLabel(holders.length)}</span>
    </div>
  );
}
