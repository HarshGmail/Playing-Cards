'use client';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { buildScoreboardRows } from '@/lib/domain/scoreboard';

interface ScoreTrendChartProps {
  rounds: Array<{ round: number; scores: Array<{ playerId: string; value: number }> }>;
  players: Array<{ userId: string; userName: string }>;
}

export default function ScoreTrendChart({ rounds, players }: ScoreTrendChartProps) {
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
    legend: { itemStyle: { color: '#9ca3af' } },
    series,
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
