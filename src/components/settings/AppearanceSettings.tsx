'use client';

import SegmentedToggle from '@/components/profile/SegmentedToggle';
import { useUIStore } from '@/lib/store/uiStore';
import type { ThemeChoice } from '@/lib/theme/theme';

const THEME_OPTIONS: Array<{ value: ThemeChoice; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function AppearanceSettings() {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);

  return (
    <div className="space-y-2">
      <SegmentedToggle options={THEME_OPTIONS} value={theme} onChange={setTheme} ariaLabel="Theme" />
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Saved in this browser. System follows your device’s light or dark setting.
      </p>
    </div>
  );
}
