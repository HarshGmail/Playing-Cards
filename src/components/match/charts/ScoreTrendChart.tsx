'use client';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { buildScoreboardRows } from '@/lib/domain/scoreboard';
import { playerLabelHtml } from './playerLabel';
import type { PlayersById } from '@/types';

interface ScoreTrendChartProps {
  rounds: Array<{ round: number; scores: Array<{ playerId: string; value: number }> }>;
  players: Array<{ userId: string; userName: string }>;
  playersById: PlayersById;
}

export default function ScoreTrendChart({
  rounds,
  players,
  playersById,
}: ScoreTrendChartProps) {
  if (rounds.length === 0 || players.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">No rounds played yet</p>
      </div>
    );
  }

  const rows = buildScoreboardRows(rounds, players);

  const series: Highcharts.SeriesLineOptions[] = rows.map((row) => {
    let running = 0;
    const data = row.cells.map((cell) => {
      if (cell !== null) running += cell;
      return running;
    });
    return { type: 'line', name: row.userName, data };
  });

  const options: Highcharts.Options = {
    chart: { type: 'line', backgroundColor: 'transparent', height: 320 },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories: rounds.map((r) => `R${r.round}`),
      labels: { style: { color: '#9ca3af' } },
    },
    yAxis: {
      title: { text: 'Running total' },
      labels: { style: { color: '#9ca3af' } },
      gridLineColor: 'rgba(148, 163, 184, 0.2)',
    },
    legend: {
      useHTML: true,
      itemStyle: { color: '#9ca3af' },
      // This chart's x-axis is rounds, so the players are named in the legend
      // rather than on an axis. Series order matches `rows`, so the series index
      // maps straight back to a player.
      labelFormatter() {
        const row = rows[(this as Highcharts.Series).index];
        if (!row) return String((this as Highcharts.Series).name);
        return playerLabelHtml({
          name: row.userName,
          profilePicUrl: playersById[row.playerId]?.profilePicUrl,
          size: 20,
          stacked: false,
        });
      },
    },
    series,
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
