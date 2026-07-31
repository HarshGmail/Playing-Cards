'use client';

import { useIncomingRequestsQuery, useAcceptRequestMutation, useDeclineRequestMutation } from '@/lib/queries/friends';
import { useUIStore } from '@/lib/store/uiStore';

export default function IncomingRequestsPanel() {
  const { data: incoming = [] } = useIncomingRequestsQuery();
  const { mutate: acceptRequest, isPending: isAccepting } = useAcceptRequestMutation();
  const { mutate: declineRequest, isPending: isDeclining } = useDeclineRequestMutation();
  const { addToast } = useUIStore();

  const handleAccept = (requestId: string) => {
    acceptRequest(requestId, {
      onSuccess: () => {
        addToast({
          type: 'success',
          message: 'Friend request accepted!',
        });
      },
      onError: () => {
        addToast({
          type: 'error',
          message: 'Could not accept the request. Try again.',
        });
      },
    });
  };

  const handleDecline = (requestId: string) => {
    declineRequest(requestId, {
      onSuccess: () => {
        addToast({
          type: 'success',
          message: 'Request declined.',
        });
      },
      onError: () => {
        addToast({
          type: 'error',
          message: 'Could not decline the request. Try again.',
        });
      },
    });
  };

  if (incoming.length === 0) {
    return null;
  }

  const isPending = isAccepting || isDeclining;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
        Friend Requests ({incoming.length})
      </h3>
      <div className="space-y-2">
        {incoming.map((req) => (
          <div
            key={req.id}
            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {req.fromUserName}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                @{req.fromUsername}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(req.id)}
                disabled={isPending}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm font-medium"
              >
                Accept
              </button>
              <button
                onClick={() => handleDecline(req.id)}
                disabled={isPending}
                className="px-3 py-1 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 disabled:bg-gray-400 text-gray-900 dark:text-white rounded text-sm font-medium"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
