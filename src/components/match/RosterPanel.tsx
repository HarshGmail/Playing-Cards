'use client';

import { useState } from 'react';

interface RosterEntry {
  userId: string;
  userName: string;
  status: 'active' | 'dnf';
  dnfAfterRound: number | null;
}

interface RosterPanelProps {
  matchId: string;
  roster: RosterEntry[];
  isCreator: boolean;
  onChange: () => void;
}

export default function RosterPanel({ matchId, roster, isCreator, onChange }: RosterPanelProps) {
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [shareExpiresAt, setShareExpiresAt] = useState<Date | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [shareError, setShareError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAction = async (userId: string, action: 'mark-dnf' | 'rejoin') => {
    setPendingUserId(userId);
    setActionError('');
    try {
      const res = await fetch(`/api/matches/${matchId}/roster/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Failed to update player status');
      onChange();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update player status');
    } finally {
      setPendingUserId(null);
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingLink(true);
    setShareError('');
    setCopied(false);
    try {
      const res = await fetch(`/api/matches/${matchId}/share`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate invite link');
      const data = await res.json();
      setShareLink(`${window.location.origin}/join/${data.shareCode}`);
      setShareExpiresAt(new Date(data.expiresAt));
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Failed to generate invite link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
    } catch {
      alert(`Copy failed — here's the link:\n${shareLink}`);
    }
  };

  return (
    <div className="space-y-4">
      {isCreator && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white">Invite players</h3>
            <button
              type="button"
              onClick={handleGenerateInvite}
              disabled={generatingLink}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {generatingLink ? 'Generating...' : shareLink ? 'Regenerate Link' : 'Generate Invite Link'}
            </button>
          </div>
          {shareLink && (
            <div className="space-y-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {shareExpiresAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Anyone with this link can join. Expires at {shareExpiresAt.toLocaleTimeString()}.
                </p>
              )}
            </div>
          )}
          {shareError && <p className="text-sm text-red-600">{shareError}</p>}
        </div>
      )}
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}
      {roster.map((entry) => (
        <div
          key={entry.userId}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{entry.userName}</p>
            {entry.status === 'dnf' && (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Did Not Finish (after round {entry.dnfAfterRound})
              </p>
            )}
          </div>
          {isCreator && (
            <button
              disabled={pendingUserId === entry.userId}
              onClick={() =>
                handleAction(entry.userId, entry.status === 'dnf' ? 'rejoin' : 'mark-dnf')
              }
              className={`px-3 py-1 text-sm rounded-lg transition disabled:opacity-50 ${
                entry.status === 'dnf'
                  ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400'
              }`}
            >
              {entry.status === 'dnf' ? 'Rejoin' : 'Mark DNF'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
