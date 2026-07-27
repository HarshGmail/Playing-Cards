'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Landing() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          router.push('/dashboard');
          return;
        }
      } catch {
        // Ignore
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [router]);

  if (isLoading) {
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
            <p className="text-center text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            ♠ Playing Cards
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Score tracker for your games</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg p-8 space-y-4">
          <Link
            href="/?tab=login"
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            Log In
          </Link>
          <Link
            href="/?tab=signup"
            className="block w-full text-center bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
