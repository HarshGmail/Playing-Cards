'use client';

import { useEffect, useRef, useState } from 'react';
import { Share } from 'lucide-react';

interface ShareMatchButtonProps {
  matchId: string;
}

export default function ShareMatchButton({ matchId }: ShareMatchButtonProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<'player' | 'spectator'>('player');
  const [shareLink, setShareLink] = useState('');
  const [shareExpiresAt, setShareExpiresAt] = useState<Date | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [shareError, setShareError] = useState('');
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleGenerateInvite = async () => {
    setGeneratingLink(true);
    setShareError('');
    setCopied(false);
    try {
      const res = await fetch(`/api/matches/${matchId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
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

  const handleRoleChange = (nextRole: 'player' | 'spectator') => {
    setRole(nextRole);
    setShareLink('');
    setShareExpiresAt(null);
    setCopied(false);
  };

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition flex items-center gap-2"
      >
        <Share className="w-4 h-4" />
        Share
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 space-y-3">
          <h3 className="font-medium text-gray-900 dark:text-white">Invite link</h3>

          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            <button
              type="button"
              onClick={() => handleRoleChange('player')}
              className={`flex-1 px-3 py-1.5 text-sm font-medium transition ${
                role === 'player'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Player
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('spectator')}
              className={`flex-1 px-3 py-1.5 text-sm font-medium transition ${
                role === 'spectator'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Spectate
            </button>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleGenerateInvite}
              disabled={generatingLink}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {generatingLink ? 'Generating...' : shareLink ? 'Regenerate' : 'Generate Link'}
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
    </div>
  );
}
