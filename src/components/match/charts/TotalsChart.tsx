'use client';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { playerLabelHtml } from './playerLabel';
import type { PlayersById } from '@/types';

interface TotalsChartProps {
  entries: Array<{ playerId: string; name: string; total: number; isDnf: boolean }>;
  playersById: PlayersById;
}

export default function TotalsChart({ entries, playersById }: TotalsChartProps) {
  const sorted = [...entries].sort((a, b) => b.total - a.total);

  const options: Highcharts.Options = {
    chart: { type: 'column', backgroundColor: 'transparent', height: 280 },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories: sorted.map((e) => e.name),
      labels: {
        useHTML: true,
        // `pos` is the category index, so this indexes `sorted` directly rather
        // than matching on the name — two players can share a display name.
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
      title: { text: 'Total' },
      labels: { style: { color: '#9ca3af' } },
      gridLineColor: 'rgba(148, 163, 184, 0.2)',
    },
    legend: { enabled: false },
    series: [
      {
        type: 'column',
        name: 'Total',
        data: sorted.map((e) => ({
          y: e.total,
          color: e.isDnf ? '#9ca3af' : '#7c3aed',
        })),
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
