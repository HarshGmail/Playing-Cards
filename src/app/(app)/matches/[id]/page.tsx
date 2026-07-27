'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Leaderboard from '@/components/match/Leaderboard';
import Scoreboard from '@/components/match/Scoreboard';
import RoundForm from '@/components/match/RoundForm';
import SubmittedRounds from '@/components/match/SubmittedRounds';

export default function MatchPage() {
  const params = useParams();
  const matchId = params.id as string;
  const [tab, setTab] = useState('leaderboard');
  const [match, setMatch] = useState<any>(null);
  const [state, setState] = useState<any>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matchRes, stateRes, roundsRes] = await Promise.all([
          fetch(`/api/matches/${matchId}`),
          fetch(`/api/matches/${matchId}/state`),
          fetch(`/api/matches/${matchId}/rounds`),
        ]);

        if (!matchRes.ok) throw new Error('Match not found');

        const matchData = await matchRes.json();
        const stateData = stateRes.ok ? await stateRes.json() : null;
        const roundsData = roundsRes.ok ? await roundsRes.json() : { rounds: [] };

        setMatch(matchData.match);
        setState(stateData?.state);
        setRounds(roundsData.rounds);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load match');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [matchId]);

  const handleRoundSubmit = async (scores: any[]) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores }),
      });
      if (!res.ok) throw new Error('Failed to submit round');
      window.location.reload();
    } catch (err) {
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading match...</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 flex items-center justify-center">
        <p className="text-red-600">{error || 'Match not found'}</p>
      </div>
    );
  }

  const playerNames = Object.fromEntries(
    match.roster.map((r: any) => [r.userId, r.userName])
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {match.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Round {match.roundsPlayed} • {match.roster.length} players • {match.status}
        </p>

        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          {['leaderboard', 'scoreboard', 'rounds', 'form'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-medium transition-colors ${
                tab === t
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {tab === 'leaderboard' && state && (
            <Leaderboard entries={state.leaderboard} />
          )}
          {tab === 'scoreboard' && (
            <Scoreboard rounds={rounds} players={match.roster} />
          )}
          {tab === 'rounds' && (
            <SubmittedRounds
              rounds={rounds}
              playerNames={playerNames}
              isCreator={match.creatorId === 'currentUserId'}
            />
          )}
          {tab === 'form' && (
            <RoundForm
              round={match.roundsPlayed + 1}
              players={match.roster}
              onSubmit={handleRoundSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
