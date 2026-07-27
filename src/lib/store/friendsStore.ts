import { create } from 'zustand';

export interface Friend {
  userId: string;
  name: string;
  username: string;
  profilePicUrl: string | null;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUsername: string;
  createdAt: string;
}

export interface FriendsState {
  friends: Friend[];
  incoming: FriendRequest[];
  isLoading: boolean;
  error: string | null;
  fetchFriends: () => Promise<void>;
  fetchIncomingRequests: () => Promise<void>;
  addFriend: (userId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  incoming: [],
  isLoading: false,
  error: null,

  fetchFriends: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/friends');
      if (!res.ok) throw new Error('Failed to fetch friends');
      const data = await res.json();
      set({ friends: data.friends || [], isLoading: false });
    } catch (err) {
      set({ error: 'Failed to load friends', isLoading: false });
    }
  },

  fetchIncomingRequests: async () => {
    try {
      const res = await fetch('/api/friends/requests');
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      set({ incoming: data.requests || [] });
    } catch (err) {
      set({ error: 'Failed to load requests' });
    }
  },

  addFriend: async (userId: string) => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: userId }),
      });
      if (!res.ok) throw new Error('Failed to send friend request');
      await get().fetchIncomingRequests();
    } catch (err) {
      set({ error: 'Failed to send friend request' });
      // Rethrow so the caller can tell the user it failed rather than
      // reporting success unconditionally.
      throw err;
    }
  },

  removeFriend: async (userId: string) => {
    try {
      const res = await fetch(`/api/friends/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove friend');
      await get().fetchFriends();
    } catch (err) {
      set({ error: 'Failed to remove friend' });
    }
  },

  acceptRequest: async (requestId: string) => {
    try {
      const res = await fetch(`/api/friends/requests/${requestId}/accept`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to accept request');
      await Promise.all([get().fetchFriends(), get().fetchIncomingRequests()]);
    } catch (err) {
      set({ error: 'Failed to accept request' });
    }
  },

  declineRequest: async (requestId: string) => {
    try {
      const res = await fetch(`/api/friends/requests/${requestId}/decline`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to decline request');
      await get().fetchIncomingRequests();
    } catch (err) {
      set({ error: 'Failed to decline request' });
    }
  },
}));
