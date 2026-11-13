'use client';

import { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useUIStore } from '@/lib/store/uiStore';
import {
  applyThemeChoice,
  readStoredThemeChoice,
  subscribeToSystemTheme,
} from '@/lib/theme/theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const choice = readStoredThemeChoice();
    useUIStore.setState({ theme: choice });
    applyThemeChoice(choice);
    return subscribeToSystemTheme(() => {
      if (useUIStore.getState().theme === 'system') applyThemeChoice('system');
    });
  }, []);

  if (!mounted) return null;

  return <>{children}</>;
}
