'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  username: string;
}

interface Step2Props {
  creatorRole: string;
  onNext: (playerIds: string[]) => void;
  onBack: () => void;
}

export default function CreateMatchStep2({ creatorRole, onNext, onBack }: Step2Props) {
  const [selected, setSelected] = useState<string[]>(creatorRole === 'score-and-play' ? ['self'] : []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/users/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery, limit: 10 }),
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        setError('Failed to search users');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const togglePlayer = (id: string) => {
    if (id === 'self') return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (selected.length === 0) {
      setError('Add at least one player');
      return;
    }
    // Remove 'self' marker, send actual player IDs
    const playerIds = selected.filter((p) => p !== 'self');
    onNext(playerIds);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Search Players
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or username..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
        />
      </div>

      {selected.length > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
            {selected.length} player(s) selected
          </p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">Search Results</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {searchResults.map((player) => (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selected.includes(player.id)
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                <p className="font-medium text-gray-900 dark:text-white">{player.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">@{player.username}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          Next: Review
        </button>
      </div>
    </div>
  );
}
