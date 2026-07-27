import { create } from 'zustand';
import type { MatchState, MatchSummary } from '@/types';

export interface MatchStoreState {
  matches: MatchSummary[];
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
      // The list holds summaries, so project the full state down to one
      // rather than storing mismatched shapes side by side.
      const summary: MatchSummary = {
        id: match.match.id,
        name: match.match.name,
        creatorId: match.match.creatorId,
        status: match.match.status,
        roundsPlayed: match.match.roundsPlayed,
        roster: match.roster,
        version: match.version,
      };
      const updated = state.matches.map((m) => (m.id === matchId ? summary : m));
      const current =
        state.currentMatch?.match.id === matchId ? match : state.currentMatch;
      return { matches: updated, currentMatch: current };
    });
  },

  setCurrentMatch: (match: MatchState | null) => set({ currentMatch: match }),
}));
