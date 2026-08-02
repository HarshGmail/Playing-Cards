'use client';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { playerLabelHtml } from './playerLabel';
import type { PlayersById } from '@/types';

interface RoundsWonChartProps {
  entries: Array<{ playerId: string; name: string; gamesWon: number }>;
  playersById: PlayersById;
}

export default function RoundsWonChart({ entries, playersById }: RoundsWonChartProps) {
  const sorted = [...entries].sort((a, b) => b.gamesWon - a.gamesWon);

  const options: Highcharts.Options = {
    chart: { type: 'column', backgroundColor: 'transparent', height: 280 },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories: sorted.map((e) => e.name),
      labels: {
        useHTML: true,
        formatter() {
          const entry = sorted[this.pos];
          if (!entry) return String(this.value);
          return playerLabelHtml({
            name: entry.name,
            profilePicUrl: playersById[entry.playerId]?.profilePicUrl,
          });
        },
        style: { color: '#9ca3af' },
      },
    },
    yAxis: {
      title: { text: 'Rounds won' },
      labels: { style: { color: '#9ca3af' } },
      gridLineColor: 'rgba(148, 163, 184, 0.2)',
      allowDecimals: false,
    },
    legend: { enabled: false },
    series: [
      {
        type: 'column',
        name: 'Rounds won',
        data: sorted.map((e) => e.gamesWon),
        color: '#16a34a',
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
