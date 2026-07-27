import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  isOnline: boolean;
  toasts: Toast[];
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setOnline: (isOnline: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: 'system',
  isOnline: true,
  toasts: [],

  setTheme: (theme: 'light' | 'dark' | 'system') => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
      updateTheme(theme);
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

function updateTheme(theme: 'light' | 'dark' | 'system') {
  if (typeof window === 'undefined') return;

  const html = document.documentElement;
  let effectiveTheme = theme;

  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  if (effectiveTheme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}
