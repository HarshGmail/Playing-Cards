'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/lib/store/uiStore';

export default function OfflineBanner() {
  const { isOnline, setOnline } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  if (!mounted || isOnline) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
      <p className="text-sm text-amber-800 dark:text-amber-200">
        You are offline. Some features may be unavailable.
      </p>
    </div>
  );
}
