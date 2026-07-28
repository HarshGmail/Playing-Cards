'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';

// Only allow same-origin relative paths, so a crafted `redirect` query
// param can't be used to bounce a logged-in user to an external site.
const safeRedirect = (path: string | null) =>
  path && path.startsWith('/') && !path.startsWith('//') ? path : '/dashboard';

export default function Landing() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(true);
  const destination = safeRedirect(searchParams.get('redirect'));

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          router.push(destination);
          return;
        }
      } catch {
        // Ignore
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [router, destination]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'signup') {
      setTab('signup');
    } else {
      setTab('login');
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">♠ Playing Cards</h1>
            <p className="text-gray-600 dark:text-gray-400">Score tracker for your games</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg p-8">
            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleLoginSuccess = () => {
    router.push(destination);
  };

  const handleSignupSuccess = () => {
    router.push(destination);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">♠ Playing Cards</h1>
          <p className="text-gray-600 dark:text-gray-400">Score tracker for your games</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg p-8">
          {/* Tab switcher */}
          <div className="flex gap-0 mb-6 bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => {
                setTab('login');
                const qs = new URLSearchParams({ tab: 'login', ...(searchParams.get('redirect') ? { redirect: searchParams.get('redirect')! } : {}) });
                window.history.pushState(null, '', `/?${qs.toString()}`);
              }}
              className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${
                tab === 'login'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setTab('signup');
                const qs = new URLSearchParams({ tab: 'signup', ...(searchParams.get('redirect') ? { redirect: searchParams.get('redirect')! } : {}) });
                window.history.pushState(null, '', `/?${qs.toString()}`);
              }}
              className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${
                tab === 'signup'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Forms */}
          {tab === 'login' ? (
            <LoginForm onSuccess={handleLoginSuccess} />
          ) : (
            <SignupForm onSuccess={handleSignupSuccess} />
          )}
        </div>
      </div>
    </div>
  );
}
