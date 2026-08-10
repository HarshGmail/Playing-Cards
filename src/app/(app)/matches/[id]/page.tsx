'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUIStore } from '@/lib/store/uiStore';
import { matchKeys } from '@/lib/queries/keys';
import type { PlayersById } from '@/types';
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
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { gameDisplayName, rulesPathFor } from '@/lib/games/catalog';

export default function MatchPage() {
  const params = useParams();
  const matchId = params.id as string;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [tab, setTab] = useState('leaderboard');
  const [editingRound, setEditingRound] = useState<number | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

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

  /**
   * RosterPanel PATCHes the roster directly, outside the mutation hooks, so it
   * has no cache of its own to invalidate. matchKeys.detail is a prefix of the
   * state and rounds keys, so this one call refreshes all three.
   */
  const handleRosterChange = () => {
    queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
  };

  const handleEndMatch = () => {
    endMatchMutation.mutate(undefined, {
      onSuccess: () => setConfirmingEnd(false),
      onError: () =>
        addToast({ type: 'error', message: 'Could not end the match. Try again.' }),
    });
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

  /**
   * Identity for every player in this match, keyed by userId. Leaderboard
   * entries, scoreboard rows and podium places all key on `playerId`, which *is*
   * the roster userId, so this one record serves all of them.
   *
   * `username` is the real handle from the users collection — roster.userName is
   * the display name and cannot be used to build profile links.
   */
  const playersById: PlayersById = Object.fromEntries(
    match.roster.map((r: any) => [
      r.userId,
      {
        name: r.userName,
        username: r.username ?? '',
        profilePicUrl: r.profilePicUrl ?? null,
      },
    ])
  );
  const isCreator = !!user && match.creatorId === user.id;
  const pendingInvites = match.pendingInvites ?? [];
  // Matches predating the gameType field resolve to Least Count; 'other' games
  // carry a free-text label and have no rules page to link to.
  const gameName = gameDisplayName(match.gameType, match.gameLabel);
  const rulesPath = rulesPathFor(match.gameType);
  // The scorer alone is not a match. Rounds are rejected below two active
  // players, so surface why rather than letting the form 409.
  const activePlayerCount = match.roster.filter((r: any) => r.status === 'active').length;
  const canScoreRound = activePlayerCount >= 2;
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
                onClick={() => setConfirmingEnd(true)}
                disabled={endMatchMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 shrink-0"
              >
                {endMatchMutation.isPending ? 'Ending...' : 'End Match'}
              </button>
            )}
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {gameName} • Round {match.roundsPlayed} • {match.roster.length} players
          {pendingInvites.length > 0 && ` • ${pendingInvites.length} invited`} •{' '}
          {match.status}
          {rulesPath && (
            <>
              {' • '}
              <Link
                href={rulesPath}
                target="_blank"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Rules
              </Link>
            </>
          )}
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
              playersById={playersById}
              rankPreference={match.rankPreference}
              ended={match.status === 'ended'}
            />
          )}
          {tab === 'scoreboard' && (
            <Scoreboard
              rounds={rounds}
              players={match.roster}
              playersById={playersById}
              leaderboard={state?.leaderboard}
              rankPreference={match.rankPreference}
            />
          )}
          {tab === 'rounds' && (
            <SubmittedRounds
              rounds={rounds}
              playerNames={playerNames}
              playersById={playersById}
              isCreator={isCreator}
              onEdit={setEditingRound}
            />
          )}
          {tab === 'form' && isCreator && match.status === 'active' && (
            canScoreRound ? (
              <RoundForm
                matchId={matchId}
                round={match.roundsPlayed + 1}
                players={match.roster}
                onSubmit={handleRoundSubmit}
              />
            ) : (
              <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="font-medium text-yellow-900 dark:text-yellow-300">
                  Waiting for players
                </p>
                <p className="text-sm text-yellow-800/80 dark:text-yellow-300/80 mt-1">
                  {pendingInvites.length > 0
                    ? `${pendingInvites.length} invited player${
                        pendingInvites.length === 1 ? '' : 's'
                      } ${
                        pendingInvites.length === 1 ? 'has' : 'have'
                      } not accepted yet. A round needs at least two active players.`
                    : 'A round needs at least two active players. Invite someone from the Roster tab or share the join link.'}
                </p>
              </div>
            )
          )}
          {tab === 'roster' && (
            <RosterPanel
              matchId={matchId}
              roster={match.roster}
              pendingInvites={pendingInvites}
              isCreator={isCreator}
              onChange={handleRosterChange}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmingEnd}
        title="End this match?"
        message="No more rounds can be added afterward."
        confirmLabel={endMatchMutation.isPending ? 'Ending...' : 'End Match'}
        destructive
        busy={endMatchMutation.isPending}
        onConfirm={handleEndMatch}
        onCancel={() => setConfirmingEnd(false)}
      />

      {editingRound !== null && (() => {
        const roundData = rounds.find((r) => r.round === editingRound);
        if (!roundData) return null;
        return (
          <EditRoundModal
            matchId={matchId}
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
