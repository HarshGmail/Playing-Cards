'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Landing() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        router.push('/dashboard');
      }
    };
    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            ♠ Playing Cards
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Score tracker for your games</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg p-8">
          <p className="text-center text-gray-600 dark:text-gray-400">
            Loading...
          </p>
        </div>
      </div>
    </div>
  );
}
