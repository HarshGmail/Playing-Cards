import { create } from 'zustand';

export interface Notification {
  id: string;
  type:
    | 'friend-request'
    | 'friend-accepted'
    | 'join-request'
    | 'join-approved'
    | 'join-declined'
    | 'added-to-match'
    | 'match-ended';
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    // Skip if a previous fetch is still in flight (a slow request shouldn't
    // stack with the next poll tick) or the tab is hidden/offline.
    if (get().isLoading) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    set({ isLoading: true });
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      const notifications = data.notifications || [];
      set({
        notifications,
        unreadCount: notifications.filter((n: Notification) => !n.read).length,
        error: null,
      });
    } catch (err) {
      set({ error: 'Failed to load notifications' });
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      await get().fetchNotifications();
    } catch (err) {
      set({ error: 'Failed to mark as read' });
    }
  },

  markAllAsRead: async () => {
    try {
      // Mark-all-read is POST on the collection itself; there is no
      // /mark-all-read subroute (that URL resolves to [id], which is PATCH-only).
      const res = await fetch('/api/notifications', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
      await get().fetchNotifications();
    } catch (err) {
      set({ error: 'Failed to mark all as read' });
    }
  },
}));
