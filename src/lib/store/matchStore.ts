import { create } from 'zustand';
import type { MatchState } from '@/types';

export interface MatchStoreState {
  matches: MatchState[];
  currentMatch: MatchState | null;
  isLoading: boolean;
  error: string | null;
  fetchMatches: () => Promise<void>;
  fetchMatch: (matchId: string) => Promise<void>;
  updateMatch: (matchId: string, match: MatchState) => void;
  setCurrentMatch: (match: MatchState | null) => void;
}

export const useMatchStore = create<MatchStoreState>((set) => ({
  matches: [],
  currentMatch: null,
  isLoading: false,
  error: null,

  fetchMatches: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/matches');
      if (!res.ok) throw new Error('Failed to fetch matches');
      const data = await res.json();
      set({ matches: data.matches || [], isLoading: false });
    } catch (err) {
      set({ error: 'Failed to load matches', isLoading: false });
    }
  },

  fetchMatch: async (matchId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      if (!res.ok) throw new Error('Failed to fetch match');
      const data = await res.json();
      set({ currentMatch: data, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to load match', isLoading: false });
    }
  },

  updateMatch: (matchId: string, match: MatchState) => {
    set((state) => {
      const updated = state.matches.map((m) =>
        m.match.id === matchId ? match : m
      );
      const current =
        state.currentMatch?.match.id === matchId ? match : state.currentMatch;
      return { matches: updated, currentMatch: current };
    });
  },

  setCurrentMatch: (match: MatchState | null) => set({ currentMatch: match }),
}));
