'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  const handleLoginSuccess = () => {
    router.push('/dashboard');
  };

  const handleSignupSuccess = () => {
    router.push('/dashboard');
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          ♠ Playing Cards
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Score tracker for your games</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg p-8">
        {/* Tab switcher */}
        <div className="flex gap-0 mb-6 bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${
              tab === 'login'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => setTab('signup')}
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
        {tab === 'login' && <LoginForm onSuccess={handleLoginSuccess} />}
        {tab === 'signup' && <SignupForm onSuccess={handleSignupSuccess} />}
      </div>
    </div>
  );
}
