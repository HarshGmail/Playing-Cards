'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useNotificationsQuery } from '@/lib/queries/notifications';
import Header from '@/components/layout/Header';
import OfflineBanner from '@/components/layout/OfflineBanner';
import Toaster from '@/components/ui/Toaster';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth(true);
  const { data: notifications } = useNotificationsQuery(!!user);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [isLoading, user, router]);

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
