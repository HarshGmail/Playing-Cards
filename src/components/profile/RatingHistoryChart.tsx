'use client';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ChartRating, formatRatingDelta } from '@/lib/domain/ratingHistory';

interface RatingHistoryChartProps {
  points: ChartRating[];
  trendingUp: boolean;
}

const GAIN_COLOR = '#22c55e';
const LOSS_COLOR = '#ef4444';
const AXIS_LABEL_COLOR = '#9ca3af';
const CHART_HEIGHT = 200;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function formatMatchDate(time: number): string {
  return new Date(time).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function RatingHistoryChart({ points, trendingUp }: RatingHistoryChartProps) {
  const color = trendingUp ? GAIN_COLOR : LOSS_COLOR;

  const options: Highcharts.Options = {
    chart: { type: 'area', backgroundColor: 'transparent', height: CHART_HEIGHT, spacingLeft: 0 },
    title: { text: undefined },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      type: 'datetime',
      labels: { style: { color: AXIS_LABEL_COLOR } },
      lineColor: 'rgba(148, 163, 184, 0.3)',
      tickColor: 'rgba(148, 163, 184, 0.3)',
    },
    yAxis: {
      title: { text: undefined },
      labels: { style: { color: AXIS_LABEL_COLOR } },
      gridLineColor: 'rgba(148, 163, 184, 0.2)',
      allowDecimals: false,
    },
    tooltip: {
      useHTML: true,
      formatter() {
        const match = this.options.custom?.match as ChartRating['match'];
        if (!match) return false;
        const deltaColor = match.delta >= 0 ? GAIN_COLOR : LOSS_COLOR;
        return `<b>${escapeHtml(match.matchName)}</b><br/>${formatMatchDate(match.time)}<br/>Rating <b>${match.rating}</b> <span style="color:${deltaColor}">${formatRatingDelta(match.delta)}</span>`;
      },
    },
    plotOptions: {
      area: {
        color,
        lineWidth: 2,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, Highcharts.color(color).setOpacity(0.35).get('rgba') as string],
            [1, Highcharts.color(color).setOpacity(0).get('rgba') as string],
          ],
        },
        threshold: null,
        marker: { enabled: false, states: { hover: { enabled: true } } },
      },
    },
    series: [
      {
        type: 'area',
        name: 'Rating',
        data: points.map((point) => ({
          x: point.time,
          y: point.rating,
          custom: { match: point.match },
        })),
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
