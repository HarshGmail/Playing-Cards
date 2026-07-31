'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  useMatchQuery,
  useMatchStateQuery,
  useMatchRoundsQuery,
  useSubmitRoundMutation,
  useEditRoundMutation,
  useEndMatchMutation,
} from '@/lib/queries/matchDetail';
import LeaderboardSection from '@/components/match/LeaderboardSection';
import Scoreboard from '@/components/match/Scoreboard';
import RoundForm from '@/components/match/RoundForm';
import SubmittedRounds from '@/components/match/SubmittedRounds';
import RosterPanel from '@/components/match/RosterPanel';
import ShareMatchButton from '@/components/match/ShareMatchButton';
import JoinRequestsPanel from '@/components/match/JoinRequestsPanel';
import EditRoundModal from '@/components/match/EditRoundModal';

export default function MatchPage() {
  const params = useParams();
  const matchId = params.id as string;
  const { user } = useAuth();
  const [tab, setTab] = useState('leaderboard');
  const [editingRound, setEditingRound] = useState<number | null>(null);

  const { data: match, isLoading: matchLoading, error: matchError } = useMatchQuery(matchId);
  const { data: state, isLoading: stateLoading } = useMatchStateQuery(matchId);
  const { data: rounds = [], isLoading: roundsLoading } = useMatchRoundsQuery(matchId);

  const submitRoundMutation = useSubmitRoundMutation(matchId);
  const editRoundMutation = useEditRoundMutation(matchId);
  const endMatchMutation = useEndMatchMutation(matchId);

  const loading = matchLoading || stateLoading || roundsLoading;
  const error = matchError?.message || '';

  const handleRoundSubmit = async (scores: any[]) => {
    await submitRoundMutation.mutateAsync({ scores });
    setTab('leaderboard');
  };

  const handleRoundEdit = async (round: number, scores: any[]) => {
    await editRoundMutation.mutateAsync({ round, scores });
  };

  const handleEndMatch = async () => {
    if (!confirm('End this match? No more rounds can be added afterward.')) return;
    await endMatchMutation.mutateAsync();
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
          <div className="flex items-center gap-2 shrink-0">
            {isCreator && <ShareMatchButton matchId={matchId} />}
            {isCreator && match.status === 'active' && (
              <button
                onClick={handleEndMatch}
                disabled={endMatchMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 shrink-0"
              >
                {endMatchMutation.isPending ? 'Ending...' : 'End Match'}
              </button>
            )}
          </div>
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
