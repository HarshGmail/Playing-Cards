interface FriendCardProps {
  name: string;
  username: string;
  profilePicUrl?: string | null;
  onRemove?: () => void;
}

export default function FriendCard({
  name,
  username,
  profilePicUrl,
  onRemove,
}: FriendCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold flex-shrink-0">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">
          {name}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
          @{username}
        </p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
        >
          Remove
        </button>
      )}
    </div>
  );
}
