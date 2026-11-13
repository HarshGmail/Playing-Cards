'use client';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { buildPositionHistory, type PositionRosterEntry } from '@/lib/domain/positionHistory';
import { playerLabelHtml } from './playerLabel';
import type { PlayersById } from '@/types';

interface PositionTrendChartProps {
  rounds: Array<{ round: number; scores: Array<{ playerId: string; value: number }> }>;
  roster: PositionRosterEntry[];
  rankPreference: 'highest-first' | 'lowest-first';
  tiebreakers: string[];
  playersById: PlayersById;
}

export default function PositionTrendChart({
  rounds,
  roster,
  rankPreference,
  tiebreakers,
  playersById,
}: PositionTrendChartProps) {
  if (rounds.length === 0 || roster.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">No rounds played yet</p>
      </div>
    );
  }

  const history = buildPositionHistory(rounds, roster, rankPreference, tiebreakers);

  const series: Highcharts.SeriesLineOptions[] = roster.map((player) => ({
    type: 'line',
    name: player.userName,
    data: history.map(({ positions }) => positions.get(player.userId) ?? null),
    marker: { enabled: true, radius: 4 },
  }));

  const options: Highcharts.Options = {
    chart: { type: 'line', backgroundColor: 'transparent', height: 320 },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories: history.map(({ round }) => `R${round}`),
      labels: { style: { color: '#9ca3af' } },
    },
    yAxis: {
      title: { text: 'Position' },
      reversed: true,
      min: 1,
      max: roster.length,
      tickInterval: 1,
      allowDecimals: false,
      labels: { style: { color: '#9ca3af' } },
      gridLineColor: 'rgba(148, 163, 184, 0.2)',
    },
    legend: {
      useHTML: true,
      itemStyle: { color: '#9ca3af' },
      labelFormatter() {
        const player = roster[(this as Highcharts.Series).index];
        if (!player) return String((this as Highcharts.Series).name);
        return playerLabelHtml({
          name: player.userName,
          profilePicUrl: playersById[player.userId]?.profilePicUrl,
          size: 20,
          stacked: false,
        });
      },
    },
    series,
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
