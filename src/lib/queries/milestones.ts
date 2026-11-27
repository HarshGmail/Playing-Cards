import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/fetcher';
import type { MilestoneFriendHolder } from '@/types';
import { milestoneKeys } from './keys';

const FRIEND_HOLDERS_STALE_TIME_MS = 5 * 60_000;

export function useFriendMilestoneHoldersQuery() {
  return useQuery({
    queryKey: milestoneKeys.friendHolders(),
    queryFn: () =>
      apiFetch<{ holders: Record<string, MilestoneFriendHolder[]> }>('/api/milestones/friends').then(
        (data) => data.holders
      ),
    staleTime: FRIEND_HOLDERS_STALE_TIME_MS,
  });
}
