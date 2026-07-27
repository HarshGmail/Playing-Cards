'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoinByCode = async () => {
    if (!code.trim()) {
      setError('Please enter a share code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/join/${code.toUpperCase()}`);
      if (!res.ok) throw new Error('Invalid or expired code');

      const data = await res.json();
      router.push(`/matches/${data.match.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join match');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Join a Match</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Share Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinByCode()}
                  placeholder="e.g., ABC123"
                  maxLength={6}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50"
                />
                <button
                  onClick={handleJoinByCode}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  {loading ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Ask the match creator for a share code to join. You can also request to join
                from the match list.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
