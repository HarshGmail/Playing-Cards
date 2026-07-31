'use client';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface TotalsChartProps {
  entries: Array<{ playerId: string; name: string; total: number; isDnf: boolean }>;
}

export default function TotalsChart({ entries }: TotalsChartProps) {
  const sorted = [...entries].sort((a, b) => b.total - a.total);

  const options: Highcharts.Options = {
    chart: { type: 'column', backgroundColor: 'transparent', height: 280 },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: { categories: sorted.map((e) => e.name), labels: { style: { color: '#9ca3af' } } },
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
