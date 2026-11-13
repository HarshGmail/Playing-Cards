'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api/fetcher';
import { SECONDARY_BUTTON_CLASS } from './pwaClasses';

const TEST_PUSH_URL = '/api/push/test';
const NO_PUSH_KEYS_MESSAGE = 'The server has no push keys, so nothing can be sent.';
const NO_DEVICE_MESSAGE =
  'No device of yours is signed up. Turn notifications off and on again on this device.';

interface DeliveryResult {
  service: string;
  ok: boolean;
  statusCode?: number;
  reason?: string;
}

interface TestPushAnswer {
  configured: boolean;
  results: DeliveryResult[];
}

function describeFailure(result: DeliveryResult): string {
  const status = result.statusCode ?? 'no answer';
  const detail = result.reason ? `: ${result.reason}` : '';
  return `${result.service} refused (${status}${detail})`;
}

function describeTestPush({ configured, results }: TestPushAnswer): string {
  if (!configured) return NO_PUSH_KEYS_MESSAGE;
  if (results.length === 0) return NO_DEVICE_MESSAGE;
  const sentCount = results.filter((result) => result.ok).length;
  const deviceWord = results.length === 1 ? 'device' : 'devices';
  const summary = `Sent to ${sentCount} of ${results.length} ${deviceWord}.`;
  const failures = results.filter((result) => !result.ok).map(describeFailure);
  return [summary, ...failures].join(' ');
}

export default function PushTestButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendTest() {
    setBusy(true);
    setMessage(null);
    try {
      const answer = await apiFetch<TestPushAnswer>(TEST_PUSH_URL, { method: 'POST' });
      setMessage(describeTestPush(answer));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not send a test notification');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={sendTest} disabled={busy} className={SECONDARY_BUTTON_CLASS}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Send a test notification
      </button>
      {message && <p className="text-xs text-gray-600 dark:text-gray-300">{message}</p>}
    </div>
  );
}
