import { create } from 'zustand';

export interface CreateMatchFormData {
  name: string;
  creatorRole: 'score-only' | 'score-and-play';
  rankPreference: 'highest-first' | 'lowest-first';
  tiebreakers: string[];
  playerIds: string[];
  playerNames: string[];
}

export interface CreateMatchStoreState {
  formData: CreateMatchFormData;
  currentStep: 1 | 2 | 3;
  setName: (name: string) => void;
  setCreatorRole: (role: 'score-only' | 'score-and-play') => void;
  setRankPreference: (pref: 'highest-first' | 'lowest-first') => void;
  setTiebreakers: (tiebreakers: string[]) => void;
  setPlayers: (playerIds: string[], playerNames: string[]) => void;
  addPlayer: (playerId: string, playerName: string) => void;
  removePlayer: (playerId: string) => void;
  goToStep: (step: 1 | 2 | 3) => void;
  nextStep: () => void;
  previousStep: () => void;
  reset: () => void;
}

const initialFormData: CreateMatchFormData = {
  name: '',
  creatorRole: 'score-and-play',
  rankPreference: 'highest-first',
  tiebreakers: [],
  playerIds: [],
  playerNames: [],
};

export const useCreateMatchStore = create<CreateMatchStoreState>((set) => ({
  formData: initialFormData,
  currentStep: 1,

  setName: (name: string) =>
    set((state) => ({
      formData: { ...state.formData, name },
    })),

  setCreatorRole: (role: 'score-only' | 'score-and-play') =>
    set((state) => ({
      formData: { ...state.formData, creatorRole: role },
    })),

  setRankPreference: (pref: 'highest-first' | 'lowest-first') =>
    set((state) => ({
      formData: { ...state.formData, rankPreference: pref },
    })),

  setTiebreakers: (tiebreakers: string[]) =>
    set((state) => ({
      formData: { ...state.formData, tiebreakers },
    })),

  setPlayers: (playerIds: string[], playerNames: string[]) =>
    set((state) => ({
      formData: { ...state.formData, playerIds, playerNames },
    })),

  addPlayer: (playerId: string, playerName: string) =>
    set((state) => {
      if (state.formData.playerIds.includes(playerId)) return state;
      return {
        formData: {
          ...state.formData,
          playerIds: [...state.formData.playerIds, playerId],
          playerNames: [...state.formData.playerNames, playerName],
        },
      };
    }),

  removePlayer: (playerId: string) =>
    set((state) => {
      const idx = state.formData.playerIds.indexOf(playerId);
      if (idx < 0) return state;
      return {
        formData: {
          ...state.formData,
          playerIds: state.formData.playerIds.filter((_, i) => i !== idx),
          playerNames: state.formData.playerNames.filter((_, i) => i !== idx),
        },
      };
    }),

  goToStep: (step: 1 | 2 | 3) => set({ currentStep: step }),

  nextStep: () =>
    set((state) => ({
      currentStep: (state.currentStep + 1) as 1 | 2 | 3,
    })),

  previousStep: () =>
    set((state) => ({
      currentStep: Math.max(1, state.currentStep - 1) as 1 | 2 | 3,
    })),

  reset: () => ({
    formData: initialFormData,
    currentStep: 1,
  }),
}));
