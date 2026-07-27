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
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      const notifications = data.notifications || [];
      set({
        notifications,
        unreadCount: notifications.filter((n: Notification) => !n.read).length,
      });
    } catch (err) {
      set({ error: 'Failed to load notifications' });
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
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
      await get().fetchNotifications();
    } catch (err) {
      set({ error: 'Failed to mark all as read' });
    }
  },
}));
