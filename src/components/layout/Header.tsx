'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLogoutMutation } from '@/lib/queries/auth';
import { useUIStore } from '@/lib/store/uiStore';
import Avatar from '@/components/common/Avatar';
import NotificationBell from './NotificationBell';
import Link from 'next/link';
import { Sun, Moon, LogOut, Menu, BookOpen, User as UserIcon } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const isOnOwnProfile = pathname === '/profile';
  const logoutMutation = useLogoutMutation();
  const { theme, setTheme } = useUIStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
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

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Game Rules */}
          <Link
            href="/rules"
            className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <BookOpen className="w-4 h-4" />
            Rules
          </Link>

          <NotificationBell enabled={!!user} />

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

          {user && (
            <Link
              href="/profile"
              aria-label="My profile"
              onClick={() => setIsMenuOpen(false)}
              className={`sm:hidden rounded-full p-0.5 transition ${
                isOnOwnProfile ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300 dark:ring-gray-700'
              }`}
            >
              <Avatar name={user.name} profilePicUrl={user.profilePicUrl} size={30} />
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
            aria-expanded={isMenuOpen}
            className="sm:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* User Menu */}
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/profile"
              className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-sm transition ${
                isOnOwnProfile
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {user && (
                <Avatar name={user.name} profilePicUrl={user.profilePicUrl} size={28} />
              )}
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
          <Link
            href="/profile"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-2"
          >
            {user ? (
              <Avatar name={user.name} profilePicUrl={user.profilePicUrl} size={36} />
            ) : (
              <UserIcon className="w-5 h-5" />
            )}
            <span className="min-w-0">
              <span className="block font-medium truncate">{user?.name}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">View my profile</span>
            </span>
          </Link>
          <Link
            href="/rules"
            onClick={() => setIsMenuOpen(false)}
            className="block text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-2"
          >
            Game rules
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
