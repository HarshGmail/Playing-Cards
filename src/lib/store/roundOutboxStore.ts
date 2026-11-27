import { create } from 'zustand';
import { parseOutbox, withoutQueued, withQueued, type QueuedRound } from '@/lib/domain/roundOutbox';

const STORAGE_KEY = 'playing-cards-round-outbox';

function load(): QueuedRound[] {
  if (typeof window === 'undefined') return [];
  try {
    return parseOutbox(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function save(entries: QueuedRound[]): void {
  try {
    if (entries.length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    return;
  }
}

interface RoundOutboxState {
  entries: QueuedRound[];
  hydrated: boolean;
  hydrate: () => void;
  enqueue: (entry: QueuedRound) => void;
  remove: (clientRoundId: string) => void;
}

export const useRoundOutboxStore = create<RoundOutboxState>((set, get) => ({
  entries: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({ entries: load(), hydrated: true });
  },

  enqueue: (entry) => {
    const entries = withQueued(get().hydrated ? get().entries : load(), entry);
    save(entries);
    set({ entries, hydrated: true });
  },

  remove: (clientRoundId) => {
    const entries = withoutQueued(get().entries, clientRoundId);
    save(entries);
    set({ entries });
  },
}));
