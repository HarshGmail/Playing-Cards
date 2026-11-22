interface WaitingForPlayersProps {
  pendingInviteCount: number;
}

function describePendingInvites(count: number): string {
  if (count === 0) {
    return 'A round needs at least two active players. Invite someone from the Roster tab or share the join link.';
  }
  const subject = count === 1 ? '1 invited player has' : `${count} invited players have`;
  return `${subject} not accepted yet. A round needs at least two active players.`;
}

export default function WaitingForPlayers({ pendingInviteCount }: WaitingForPlayersProps) {
  return (
    <div className="p-5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <p className="font-medium text-yellow-900 dark:text-yellow-300">Waiting for players</p>
      <p className="text-sm text-yellow-800/80 dark:text-yellow-300/80 mt-1">
        {describePendingInvites(pendingInviteCount)}
      </p>
    </div>
  );
}
