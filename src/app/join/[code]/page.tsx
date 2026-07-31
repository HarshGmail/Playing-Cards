'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function JoinCodePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const validate = async () => {
      try {
        const res = await fetch(`/api/join/${code.toUpperCase()}`);
        if (res.status === 401) {
          // Not logged in — send to login and come straight back here afterward.
          // Leave `loading` on so this page doesn't flash "Invalid Code" mid-redirect.
          router.push(`/?redirect=${encodeURIComponent(`/join/${code}`)}`);
          return;
        }
        if (!res.ok) throw new Error('Invalid or expired code');
        const data = await res.json();
        setMatch(data.match);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to validate code');
        setLoading(false);
      }
    };
    validate();
  }, [code, router]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/join/${code.toUpperCase()}`, { method: 'POST' });
      if (res.status === 401) {
        router.push(`/?redirect=${encodeURIComponent(`/join/${code}`)}`);
        return;
      }
      if (!res.ok) throw new Error('Failed to join');
      const data = await res.json();
      router.push(`/matches/${data.matchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
        <div className="text-white text-center">
          <p className="text-lg">Loading match details...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Invalid Code</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/matches/join')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            Try Another Code
          </button>
        </div>
      </div>
    );
  }

  const isSpectator = match.role === 'spectator';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">
            {isSpectator ? "You've Been Invited to Spectate" : 'Join Match'}
          </h1>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
          <p className="text-sm text-gray-600">Match Name</p>
          <p className="text-lg font-semibold text-gray-900">{match.name}</p>
          <div className="flex gap-4 text-xs text-gray-600 mt-4">
            <span>{match.playerCount} players</span>
            <span>Round {match.roundsPlayed}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
          >
            {joining ? 'Joining...' : isSpectator ? 'Spectate This Match' : 'Join This Match'}
          </button>
          <button
            onClick={() => router.push('/matches/join')}
            className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition"
          >
            Use Different Code
          </button>
        </div>
      </div>
    </div>
  );
}
