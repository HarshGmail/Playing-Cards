'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { useUIStore } from '@/lib/store/uiStore';
import { useNotificationStore } from '@/lib/store/notificationStore';
import Link from 'next/link';
import { Sun, Moon, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const { notifications, unreadCount } = useNotificationStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
          <span>♠</span>
          <span className="hidden sm:inline">Playing Cards</span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Notifications Bell */}
          <Link href="/notifications" className="relative">
            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2">
              🔔
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </Link>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="sm:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* User Menu */}
          <div className="hidden sm:flex items-center gap-2">
            <Link href={`/profile/${user?.username}`} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm">
              {user?.name}
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-4 py-3 space-y-2">
          <Link href={`/profile/${user?.username}`} className="block text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-2">
            {user?.name} (@{user?.username})
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-2"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
