'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { useUIStore } from '@/lib/store/uiStore';
import { useNotificationStore } from '@/lib/store/notificationStore';
import Header from '@/components/layout/Header';
import OfflineBanner from '@/components/layout/OfflineBanner';
import Toaster from '@/components/ui/Toaster';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, checkAuth } = useAuthStore();
  const { setTheme } = useUIStore();
  const { fetchNotifications } = useNotificationStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    // Restore theme from localStorage
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as
        | 'light'
        | 'dark'
        | 'system'
        | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }
  }, [setTheme]);

  useEffect(() => {
    // Poll notifications every 20 seconds; also refetch on regaining
    // visibility/connectivity so a backgrounded tab catches up immediately.
    if (!user) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    const handleVisibility = () => {
      if (!document.hidden) fetchNotifications();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', fetchNotifications);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', fetchNotifications);
    };
  }, [user, fetchNotifications]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <OfflineBanner />
      <main className="flex-1">{children}</main>
      <Toaster />
    </>
  );
}
