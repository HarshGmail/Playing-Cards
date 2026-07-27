import { create } from 'zustand';
import type { User } from '@/types';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  /** True once a /api/auth/me round-trip has completed (success or failure). */
  hasChecked: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  checkAuth: (force?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

// Shared across every caller, deliberately outside the store: concurrent
// checkAuth() calls collapse onto one request rather than racing.
let inFlight: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  hasChecked: false,
  error: null,

  // Seeding a user *is* a resolved session, so this marks the session checked.
  // Login/signup call it with the user their response already returns, which
  // both saves a redundant /api/auth/me round-trip and — importantly — stops a
  // stale `hasChecked: true` from a pre-login failed check short-circuiting the
  // next checkAuth() and bouncing the user straight back to the landing page.
  setUser: (user: User | null) =>
    set({ user, isLoading: false, hasChecked: true }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),

  /**
   * Resolve the current session. Safe to call from as many components as you
   * like — it hits the network at most once per session.
   *
   * Both the (app) route-group layout and the useAuth() hook call this on mount,
   * and the layout gates rendering its children on isLoading. Without the guards
   * below that combination is an infinite loop: the layout resolves auth and
   * mounts its children, a child calls checkAuth() which flips isLoading back to
   * true, the layout swaps its children for the loading state and unmounts the
   * child, then resolves and remounts it — which calls checkAuth() again.
   *
   * So: skip the request entirely once it has been made, collapse concurrent
   * calls onto one promise, and never flip isLoading back to true for a
   * re-check, which would collapse the layout and unmount the tree.
   */
  checkAuth: async (force = false) => {
    if (!force && get().hasChecked) return;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      // Only the very first check may show a loading state; a forced re-check
      // refreshes in the background.
      if (!get().hasChecked) set({ isLoading: true, error: null });
      else set({ error: null });

      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          set({ user: data.user, isLoading: false, hasChecked: true });
        } else {
          set({ user: null, isLoading: false, hasChecked: true });
        }
      } catch {
        set({
          user: null,
          error: 'Failed to check auth',
          isLoading: false,
          hasChecked: true,
        });
      }
    })();

    try {
      await inFlight;
    } finally {
      inFlight = null;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Reset hasChecked so a subsequent login re-resolves the new session
      // instead of being short-circuited by this one.
      set({ user: null, isLoading: false, hasChecked: false });
    } catch {
      set({ error: 'Failed to logout', isLoading: false });
    }
  },
}));
