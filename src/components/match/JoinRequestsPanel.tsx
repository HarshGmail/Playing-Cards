'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

interface JoinRequest {
  requestId: string;
  userId: string;
  userName: string;
  username: string;
  createdAt: string;
}

interface JoinRequestsPanelProps {
  matchId: string;
  isCreator: boolean;
}

export default function JoinRequestsPanel({ matchId, isCreator }: JoinRequestsPanelProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isCreator) return;

    const fetchRequests = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}/join-requests`);
        if (res.ok) {
          const data = await res.json();
          setRequests(data.requests || []);
        }
      } catch (err) {
        console.error('Failed to load join requests', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [matchId, isCreator]);

  const handleApprove = async (requestId: string) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/join-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      }
    } catch (err) {
      console.error('Failed to approve request', err);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/join-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      }
    } catch (err) {
      console.error('Failed to decline request', err);
    }
  };

  if (!isCreator || loading) return null;

  if (requests.length === 0) return null;

  return (
    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg space-y-3">
      <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 flex items-center gap-2">
        Join Requests ({requests.length})
      </h3>
      <div className="space-y-2">
        {requests.map((request) => (
          <div
            key={request.requestId}
            className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg"
          >
            <div className="text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{request.userName}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">@{request.username}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(request.requestId)}
                className="p-1 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded transition"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDecline(request.requestId)}
                className="p-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
