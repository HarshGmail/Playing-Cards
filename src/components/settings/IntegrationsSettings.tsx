'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound, Loader2, Trash2 } from 'lucide-react';
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '@/components/pwa/pwaClasses';
import { useApiTokensQuery, useCreateApiTokenMutation, useRevokeApiTokenMutation } from '@/lib/queries/apiTokens';
import { MAX_API_TOKENS_PER_USER } from '@/lib/schemas/apiTokens';
import type { ApiTokenSummary, CreatedApiToken } from '@/types';

const DEFAULT_TOKEN_NAME = 'Ved';
const PASTE_INSTRUCTION = 'Paste this into Ved → Settings → Integrations → Playing Cards';
const MUTED_TEXT = 'text-sm text-gray-600 dark:text-gray-400';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function describeUsage(token: ApiTokenSummary): string {
  return token.lastUsedAt ? `Last used ${formatDate(token.lastUsedAt)}` : 'Not used yet';
}

export default function IntegrationsSettings() {
  const tokens = useApiTokensQuery();
  const createToken = useCreateApiTokenMutation();
  const revokeToken = useRevokeApiTokenMutation();
  const [name, setName] = useState(DEFAULT_TOKEN_NAME);
  const [revealed, setRevealed] = useState<CreatedApiToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const list = tokens.data ?? [];
  const atLimit = list.length >= MAX_API_TOKENS_PER_USER;

  const handleCreate = () => {
    createToken.mutate(name.trim() || DEFAULT_TOKEN_NAME, {
      onSuccess: (created) => {
        setRevealed(created);
        setCopied(false);
        setCopyFailed(false);
      },
    });
  };

  const handleCopy = async () => {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.token);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900 dark:text-white">Connect Ved</h3>
        <p className={MUTED_TEXT}>
          Ved can create card nights, add rounds and read standings for you. Create a token here and paste it into Ved.
          You can have up to {MAX_API_TOKENS_PER_USER} tokens.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={50}
            aria-label="Token name"
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={createToken.isPending || atLimit}
            className={PRIMARY_BUTTON_CLASS}
          >
            {createToken.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Create token
          </button>
        </div>
        {atLimit && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            You have {MAX_API_TOKENS_PER_USER} tokens. Revoke one to create another.
          </p>
        )}
        {createToken.error && <p className="text-sm text-red-600 dark:text-red-400">{createToken.error.message}</p>}
      </div>

      {revealed && (
        <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{PASTE_INSTRUCTION}</p>
          <code className="block break-all rounded-md bg-white dark:bg-gray-900 px-3 py-2 text-sm font-mono text-gray-900 dark:text-gray-100 select-all">
            {revealed.token}
          </code>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleCopy} className={PRIMARY_BUTTON_CLASS}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" onClick={() => setRevealed(null)} className={SECONDARY_BUTTON_CLASS}>
              Done
            </button>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Shown once. If you lose it, revoke it and create a new one.
            </p>
          </div>
          {copyFailed && (
            <p className="text-sm text-red-600 dark:text-red-400">Copy failed. Select the token and copy it by hand.</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-medium text-gray-900 dark:text-white">Your tokens</h3>
        {tokens.isLoading && <p className={MUTED_TEXT}>Loading tokens…</p>}
        {tokens.error && <p className="text-sm text-red-600 dark:text-red-400">{tokens.error.message}</p>}
        {!tokens.isLoading && list.length === 0 && <p className={MUTED_TEXT}>No tokens yet.</p>}
        {list.length > 0 && (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {list.map((token) => (
              <li key={token.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{token.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {token.prefix}… · Created {formatDate(token.createdAt)} · {describeUsage(token)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revokeToken.mutate(token.id)}
                  disabled={revokeToken.isPending}
                  aria-label={`Revoke ${token.name}`}
                  className={SECONDARY_BUTTON_CLASS}
                >
                  <Trash2 className="w-4 h-4" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
