'use client';

import { useFriendsStore } from '@/lib/store/friendsStore';

export default function IncomingRequestsPanel() {
  const { incoming, acceptRequest, declineRequest } = useFriendsStore();

  if (incoming.length === 0) {
    return null;
  }

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
                onClick={() => acceptRequest(req.id)}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium"
              >
                Accept
              </button>
              <button
                onClick={() => declineRequest(req.id)}
                className="px-3 py-1 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded text-sm font-medium"
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
