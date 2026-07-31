'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import LeaderboardSection from '@/components/match/LeaderboardSection';
import Scoreboard from '@/components/match/Scoreboard';
import RoundForm from '@/components/match/RoundForm';
import SubmittedRounds from '@/components/match/SubmittedRounds';
import RosterPanel from '@/components/match/RosterPanel';
import JoinRequestsPanel from '@/components/match/JoinRequestsPanel';
import EditRoundModal from '@/components/match/EditRoundModal';

export default function MatchPage() {
  const params = useParams();
  const matchId = params.id as string;
  const { user } = useAuth();
  const [tab, setTab] = useState('leaderboard');
  const [match, setMatch] = useState<any>(null);
  const [state, setState] = useState<any>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingRound, setEditingRound] = useState<number | null>(null);
  const [endingMatch, setEndingMatch] = useState(false);

  const isFetchingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Skip this tick entirely if a previous one is still in flight, the tab
    // is hidden, or we're offline — prevents unbounded concurrent requests
    // piling up when a fetch is slow (the corporate-network TLS handshake
    // can easily exceed the 5s poll interval).
    if (isFetchingRef.current) return;
    if (document.hidden) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    isFetchingRef.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const [matchRes, stateRes, roundsRes] = await Promise.all([
        fetch(`/api/matches/${matchId}`, { signal: controller.signal }),
        fetch(`/api/matches/${matchId}/state`, { signal: controller.signal }),
        fetch(`/api/matches/${matchId}/rounds`, { signal: controller.signal }),
      ]);

      if (!matchRes.ok) throw new Error('Match not found');

      const matchData = await matchRes.json();
      const stateData = stateRes.ok ? await stateRes.json() : null;
      const roundsData = roundsRes.ok ? await roundsRes.json() : { rounds: [] };

      setMatch(matchData.match);
      setState(stateData?.state);
      setRounds(roundsData.rounds);
      setError('');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load match');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [matchId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    const handleVisibility = () => {
      if (!document.hidden) fetchData();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', fetchData);

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', fetchData);
    };
  }, [fetchData]);

  const handleRoundSubmit = async (scores: any[]) => {
    const res = await fetch(`/api/matches/${matchId}/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores }),
    });
    if (!res.ok) throw new Error('Failed to submit round');
    await fetchData();
    setTab('leaderboard');
  };

  const handleRoundEdit = async (round: number, scores: any[]) => {
    const res = await fetch(`/api/matches/${matchId}/rounds/${round}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores }),
    });
    if (!res.ok) throw new Error('Failed to save round');
    await fetchData();
  };

  const handleEndMatch = async () => {
    if (!confirm('End this match? No more rounds can be added afterward.')) return;
    setEndingMatch(true);
    try {
      const res = await fetch(`/api/matches/${matchId}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to end match');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end match');
    } finally {
      setEndingMatch(false);
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
  const isCreator = !!user && match.creatorId === user.id;
  const tabs = isCreator && match.status === 'active'
    ? ['leaderboard', 'scoreboard', 'rounds', 'form', 'roster']
    : ['leaderboard', 'scoreboard', 'rounds', 'roster'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {match.name}
          </h1>
          {isCreator && match.status === 'active' && (
            <button
              onClick={handleEndMatch}
              disabled={endingMatch}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 shrink-0"
            >
              {endingMatch ? 'Ending...' : 'End Match'}
            </button>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Round {match.roundsPlayed} • {match.roster.length} players • {match.status}
        </p>

        {isCreator && (
          <div className="mb-6">
            <JoinRequestsPanel matchId={matchId} isCreator={isCreator} />
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((t) => (
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
            <LeaderboardSection
              entries={state.leaderboard}
              rounds={rounds}
              players={match.roster}
              rankPreference={match.rankPreference}
              ended={match.status === 'ended'}
            />
          )}
          {tab === 'scoreboard' && (
            <Scoreboard
              rounds={rounds}
              players={match.roster}
              leaderboard={state?.leaderboard}
              rankPreference={match.rankPreference}
            />
          )}
          {tab === 'rounds' && (
            <SubmittedRounds
              rounds={rounds}
              playerNames={playerNames}
              isCreator={isCreator}
              onEdit={setEditingRound}
            />
          )}
          {tab === 'form' && isCreator && match.status === 'active' && (
            <RoundForm
              round={match.roundsPlayed + 1}
              players={match.roster}
              onSubmit={handleRoundSubmit}
            />
          )}
          {tab === 'roster' && (
            <RosterPanel
              matchId={matchId}
              roster={match.roster}
              isCreator={isCreator}
              onChange={fetchData}
            />
          )}
        </div>
      </div>

      {editingRound !== null && (() => {
        const roundData = rounds.find((r) => r.round === editingRound);
        if (!roundData) return null;
        return (
          <EditRoundModal
            round={editingRound}
            players={match.roster}
            existingScores={roundData.scores}
            onClose={() => setEditingRound(null)}
            onSave={(scores) => handleRoundEdit(editingRound, scores)}
          />
        );
      })()}
    </div>
  );
}
