import { create } from 'zustand';
import {
  applyThemeChoice,
  DEFAULT_THEME_CHOICE,
  ThemeChoice,
  writeStoredThemeChoice,
} from '@/lib/theme/theme';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface UIState {
  theme: ThemeChoice;
  isOnline: boolean;
  toasts: Toast[];
  setTheme: (theme: ThemeChoice) => void;
  setOnline: (isOnline: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: DEFAULT_THEME_CHOICE,
  isOnline: true,
  toasts: [],

  setTheme: (theme: ThemeChoice) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      writeStoredThemeChoice(theme);
      applyThemeChoice(theme);
    }
  },

  setOnline: (isOnline: boolean) => set({ isOnline }),

  addToast: (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const fullToast: Toast = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, fullToast] }));

    if (toast.duration !== 0) {
      const duration = toast.duration ?? 5000;
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => set({ toasts: [] }),
}));
