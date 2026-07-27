'use client';

import { useState } from 'react';

interface Step1Props {
  onNext: (data: { name: string; creatorRole: string; rankPreference: string }) => void;
}

export default function CreateMatchStep1({ onNext }: Step1Props) {
  const [name, setName] = useState('');
  const [creatorRole, setCreatorRole] = useState('score-only');
  const [rankPreference, setRankPreference] = useState('highest-first');
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!name.trim()) {
      setError('Match name is required');
      return;
    }
    if (name.length < 3 || name.length > 50) {
      setError('Match name must be 3-50 characters');
      return;
    }
    onNext({ name, creatorRole, rankPreference });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Match Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleNext()}
          placeholder="e.g., Poker Night 2024"
          maxLength={50}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Your Role
        </label>
        <select
          value={creatorRole}
          onChange={(e) => setCreatorRole(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
        >
          <option value="score-only">Score keeper (not playing)</option>
          <option value="score-and-play">Score keeper & player</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Ranking Preference
        </label>
        <select
          value={rankPreference}
          onChange={(e) => setRankPreference(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
        >
          <option value="highest-first">Highest score wins</option>
          <option value="lowest-first">Lowest score wins</option>
        </select>
      </div>

      <button
        onClick={handleNext}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
      >
        Next: Tiebreakers
      </button>
    </div>
  );
}
