import type Highcharts from 'highcharts';
import {
  AXIS_LABEL_COLOR,
  CROWN_CLEARANCE_PX,
  CROWN_HEIGHT_PX,
  FADED_OPACITY,
  FOCUSED_LINE_WIDTH,
  GRID_LINE_COLOR,
  LINE_WIDTH,
  raceDataLabels,
  raceHeadHtml,
  headRoomPx,
  type RaceFrame,
} from './raceFrame';
import { playerLabelHtml } from './playerLabel';
import { scoreRaceFinish, type CumulativeTotalsByPlayer, type RankPreference } from './scoreRaceFrame';
import type { ScoreboardRow } from '@/lib/domain/scoreboard';
import type { PlayersById } from '@/types';

export const DEFAULT_SCORE_CHART_HEIGHT = 320;
const RANGE_PADDING_RATIO = 0.12;
const MIN_RANGE_PADDING = 2;

export interface ScoreChartInput {
  rows: ScoreboardRow[];
  totals: CumulativeTotalsByPlayer;
  leaders: Map<number, Set<string>>;
  roundNumbers: number[];
  rankPreference: RankPreference;
  playersById: PlayersById;
  focusedId: string | null;
  frame: RaceFrame;
  onToggleFocus: (playerId: string) => void;
  height?: number;
}

function valueRange(totals: CumulativeTotalsByPlayer): { min: number; max: number } {
  const all = Array.from(totals.values()).flat();
  const low = Math.min(0, ...all);
  const high = Math.max(0, ...all);
  const padding = Math.max(MIN_RANGE_PADDING, Math.ceil((high - low) * RANGE_PADDING_RATIO));
  return { min: low < 0 ? low - padding : 0, max: high + padding };
}

function standingsTooltipHtml(input: ScoreChartInput, roundIndex: number): string | false {
  const { rows, totals, rankPreference, playersById, roundNumbers, focusedId } = input;
  if (roundIndex < 0 || roundIndex >= roundNumbers.length) return false;

  const ranked = rows
    .map((row) => ({
      row,
      total: totals.get(row.playerId)?.[roundIndex] ?? 0,
      roundScore: row.cells[roundIndex],
    }))
    .sort((a, b) =>
      rankPreference === 'highest-first' ? b.total - a.total : a.total - b.total
    );

  const lines = ranked.map(({ row, total, roundScore }) => {
    const rowWeight = row.playerId === focusedId ? 'font-weight:700;' : '';
    const label = playerLabelHtml({
      name: row.userName,
      profilePicUrl: playersById[row.playerId]?.profilePicUrl,
      size: 16,
      stacked: false,
    });
    const delta = roundScore === null || roundScore === undefined ? '' : `+${roundScore}`;
    return (
      `<tr style="${rowWeight}">` +
      `<td style="padding:2px 0">${label}</td>` +
      `<td style="padding:2px 0 2px 10px;text-align:right;color:#9ca3af">${delta}</td>` +
      `<td style="padding:2px 0 2px 10px;text-align:right;font-weight:700">${total}</td>` +
      `</tr>`
    );
  });

  return (
    `<div style="font-weight:700;margin-bottom:4px">After R${roundNumbers[roundIndex]}</div>` +
    `<table style="border-collapse:collapse">${lines.join('')}</table>`
  );
}

export function buildScoreChartOptions(input: ScoreChartInput): Highcharts.Options {
  const {
    rows,
    totals,
    leaders,
    roundNumbers,
    playersById,
    focusedId,
    frame,
    onToggleFocus,
    height = DEFAULT_SCORE_CHART_HEIGHT,
  } = input;
  const isFaded = (playerId: string) => focusedId !== null && focusedId !== playerId;
  const range = valueRange(totals);

  const series: Highcharts.SeriesLineOptions[] = rows.map((row) => ({
    type: 'line',
    id: row.playerId,
    name: row.userName,
    data: frame.dataByPlayer.get(row.playerId) ?? [],
    lineWidth: focusedId === row.playerId ? FOCUSED_LINE_WIDTH : LINE_WIDTH,
    opacity: isFaded(row.playerId) ? FADED_OPACITY : 1,
    zIndex: focusedId === row.playerId ? 2 : 1,
  }));

  const isCrowned = (playerId: string, x: number) => leaders.get(x)?.has(playerId) ?? false;

  const headFace = (playerId: string, x: number, style: { color?: string; faded: boolean }) => {
    const row = rows.find((entry) => entry.playerId === playerId);
    const head = frame.heads.get(playerId);
    if (!row || !head || head.x !== x) return null;
    return raceHeadHtml({
      name: row.userName,
      profilePicUrl: playersById[playerId]?.profilePicUrl,
      staggerPx: head.staggerPx,
      style,
    });
  };

  return {
    chart: {
      type: 'line',
      backgroundColor: 'transparent',
      height,
      animation: false,
      spacingRight: headRoomPx(frame.heads),
      spacingTop: CROWN_CLEARANCE_PX + CROWN_HEIGHT_PX,
    },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories: roundNumbers.map((round) => `R${round}`),
      min: 0,
      max: scoreRaceFinish(roundNumbers.length),
      labels: { style: { color: AXIS_LABEL_COLOR } },
      lineColor: GRID_LINE_COLOR,
      tickLength: 0,
    },
    yAxis: {
      title: { text: 'Running total', style: { color: AXIS_LABEL_COLOR } },
      min: range.min,
      max: range.max,
      startOnTick: false,
      endOnTick: false,
      gridLineColor: GRID_LINE_COLOR,
      labels: { style: { color: AXIS_LABEL_COLOR } },
    },
    tooltip: {
      shared: true,
      useHTML: true,
      formatter() {
        return standingsTooltipHtml(input, Math.round(this.x ?? 0));
      },
    },
    legend: { enabled: false },
    plotOptions: {
      series: {
        animation: false,
        cursor: 'pointer',
        marker: { enabled: true, radius: 4 },
        dataLabels: raceDataLabels({ isFaded, isCrowned, headFace }),
        events: {
          click() {
            if (this.options.id) onToggleFocus(this.options.id);
          },
        },
      },
    },
    series,
  };
}
