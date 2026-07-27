'use client';

interface ScoreboardProps {
  rounds: Array<{
    round: number;
    scores: Array<{
      playerId: string;
      value: number;
    }>;
  }>;
  players: Array<{
    userId: string;
    userName: string;
  }>;
}

export default function Scoreboard({ rounds, players }: ScoreboardProps) {
  if (rounds.length === 0 || players.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">No scores recorded yet</p>
      </div>
    );
  }

  // Create score matrix
  const playerMap = new Map(players.map((p) => [p.userId, p.userName]));
  const scoreMatrix = new Map<string, Map<number, number>>();

  players.forEach((p) => {
    scoreMatrix.set(p.userId, new Map());
  });

  rounds.forEach((round) => {
    round.scores.forEach((score) => {
      scoreMatrix.get(score.playerId)?.set(round.round, score.value);
    });
  });

  // Calculate running totals
  const totals = new Map<string, number>();
  players.forEach((p) => {
    let total = 0;
    for (let r = 1; r <= rounds.length; r++) {
      total += scoreMatrix.get(p.userId)?.get(r) || 0;
    }
    totals.set(p.userId, total);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <th className="p-3 text-left font-semibold text-gray-900 dark:text-white">Player</th>
            {rounds.map((round) => (
              <th
                key={round.round}
                className="p-3 text-center font-semibold text-gray-900 dark:text-white min-w-12"
              >
                R{round.round}
              </th>
            ))}
            <th className="p-3 text-center font-semibold text-gray-900 dark:text-white bg-blue-100 dark:bg-blue-900/30">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr
              key={player.userId}
              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <td className="p-3 font-medium text-gray-900 dark:text-white">{player.userName}</td>
              {rounds.map((round) => {
                const score = scoreMatrix.get(player.userId)?.get(round.round);
                return (
                  <td key={round.round} className="p-3 text-center text-gray-700 dark:text-gray-300">
                    {score !== undefined ? score : '-'}
                  </td>
                );
              })}
              <td className="p-3 text-center font-bold text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/20">
                {totals.get(player.userId) || 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
