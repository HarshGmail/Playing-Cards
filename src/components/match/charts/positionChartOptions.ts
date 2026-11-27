import type Highcharts from 'highcharts';
import { ordinal } from '@/lib/domain/milestones';
import type { PositionRosterEntry, RoundPositions } from '@/lib/domain/positionHistory';
import type { PositionStory } from '@/lib/domain/positionStory';
import { playerLabelHtml } from './playerLabel';
import {
  AXIS_LABEL_COLOR,
  CROWN_CLEARANCE_PX,
  CROWN_HEIGHT_PX,
  FOCUSED_LINE_WIDTH,
  FADED_OPACITY,
  GRID_LINE_COLOR,
  HEAD_SIZE,
  LINE_WIDTH,
  claimHeadSlot,
  headRoomPx,
  raceDataLabels,
  raceHeadHtml,
  type RaceFrame,
  type RaceHead,
} from './raceFrame';
import type { PlayersById } from '@/types';

export type { RaceFrame, RaceHead } from './raceFrame';

export interface PositionChartInput {
  history: RoundPositions[];
  story: PositionStory;
  roster: PositionRosterEntry[];
  playersById: PlayersById;
  focusedId: string | null;
  frame: RaceFrame;
  onToggleFocus: (playerId: string) => void;
  height?: number;
}

const MIN_PLAYERS_FOR_LAST_PLACE = 4;
export const DEFAULT_POSITION_CHART_HEIGHT = 340;
const LEADER_BAND_COLOR = 'rgba(168, 85, 247, 0.14)';
const LAST_PLACE_BAND_COLOR = 'rgba(239, 68, 68, 0.08)';
const PODIUM_COLORS: Record<number, string> = { 1: '#a855f7', 2: '#22c55e', 3: '#eab308' };
const LAST_PLACE_COLOR = '#ef4444';
const RISE_COLOR = '#16a34a';
const FALL_COLOR = '#dc2626';
const MUTED_COLOR = '#9ca3af';

function positionColor(position: number, lastPosition: number, fieldSize: number): string {
  const podiumColor = PODIUM_COLORS[position];
  if (podiumColor) return podiumColor;
  if (fieldSize >= MIN_PLAYERS_FOR_LAST_PLACE && position === lastPosition) return LAST_PLACE_COLOR;
  return AXIS_LABEL_COLOR;
}

function movementHtml(previous: number | undefined, current: number): string {
  if (previous === undefined) return `<span style="color:${MUTED_COLOR}">new</span>`;
  const climbed = previous - current;
  if (climbed > 0) return `<span style="color:${RISE_COLOR}">▲${climbed}</span>`;
  if (climbed < 0) return `<span style="color:${FALL_COLOR}">▼${-climbed}</span>`;
  return `<span style="color:${MUTED_COLOR}">–</span>`;
}

function standingsTooltipHtml(
  { history, roster, playersById, focusedId }: PositionChartInput,
  roundIndex: number
): string | false {
  const standing = history[roundIndex];
  if (!standing) return false;
  const previous = history[roundIndex - 1];
  const nameById = new Map(roster.map((player) => [player.userId, player.userName]));
  const ranked = Array.from(standing.positions).sort((a, b) => a[1] - b[1]);
  const lastPosition = ranked[ranked.length - 1]?.[1] ?? 1;

  const rows = ranked.map(([playerId, position]) => {
    const rowWeight = playerId === focusedId ? 'font-weight:700;' : '';
    const movement = previous ? movementHtml(previous.positions.get(playerId), position) : '';
    const label = playerLabelHtml({
      name: nameById.get(playerId) ?? 'Unknown',
      profilePicUrl: playersById[playerId]?.profilePicUrl,
      size: 16,
      stacked: false,
    });
    return (
      `<tr style="${rowWeight}">` +
      `<td style="padding:2px 8px 2px 0;font-weight:700;color:${positionColor(position, lastPosition, ranked.length)}">${ordinal(position)}</td>` +
      `<td style="padding:2px 0">${label}</td>` +
      `<td style="padding:2px 0 2px 10px;text-align:right">${movement}</td>` +
      `<td style="padding:2px 0 2px 10px;text-align:right;color:${MUTED_COLOR}">${standing.totals.get(playerId) ?? ''}</td>` +
      `</tr>`
    );
  });

  return (
    `<div style="font-weight:700;margin-bottom:4px">After R${standing.round}</div>` +
    `<table style="border-collapse:collapse">${rows.join('')}</table>`
  );
}

function positionAt(history: RoundPositions[], playerId: string, index: number) {
  return history[index]?.positions.get(playerId);
}

export function finalRaceProgress(history: RoundPositions[]): number {
  return Math.max(0, history.length - 1);
}

export function buildRaceFrame(
  history: RoundPositions[],
  roster: PositionRosterEntry[],
  progress: number
): RaceFrame {
  const dataByPlayer = new Map<string, Highcharts.PointOptionsObject[]>();
  const heads = new Map<string, RaceHead>();
  if (history.length === 0) return { dataByPlayer, heads };

  const clamped = Math.min(Math.max(progress, 0), finalRaceProgress(history));
  const settledIndex = Math.floor(clamped);
  const fraction = clamped - settledIndex;
  const claimedSpots = new Map<string, number>();

  roster.forEach((player) => {
    const points: Highcharts.PointOptionsObject[] = [];
    for (let index = 0; index <= settledIndex; index++) {
      const position = positionAt(history, player.userId, index);
      if (position !== undefined) points.push({ x: index, y: position });
    }

    const from = positionAt(history, player.userId, settledIndex);
    const to = positionAt(history, player.userId, settledIndex + 1);
    if (fraction > 0 && from !== undefined && to !== undefined) {
      points.push({ x: clamped, y: from + (to - from) * fraction });
    }

    const head = points[points.length - 1];
    if (head && typeof head.x === 'number') {
      head.marker = { enabled: false };
      heads.set(player.userId, {
        x: head.x,
        staggerPx: claimHeadSlot(claimedSpots, head.x, Number(head.y)),
      });
    }
    dataByPlayer.set(player.userId, points);
  });

  return { dataByPlayer, heads };
}

function largestFieldSize(history: RoundPositions[]): number {
  return Math.max(1, ...history.flatMap((standing) => Array.from(standing.positions.values())));
}

function positionBands(fieldSize: number): Highcharts.YAxisPlotBandsOptions[] {
  const leaderBand = { from: 0.5, to: 1.5, color: LEADER_BAND_COLOR };
  if (fieldSize < MIN_PLAYERS_FOR_LAST_PLACE) return [leaderBand];
  return [leaderBand, { from: fieldSize - 0.5, to: fieldSize + 0.5, color: LAST_PLACE_BAND_COLOR }];
}

export function buildPositionChartOptions(input: PositionChartInput): Highcharts.Options {
  const {
    history,
    story,
    roster,
    playersById,
    focusedId,
    frame,
    onToggleFocus,
    height = DEFAULT_POSITION_CHART_HEIGHT,
  } = input;
  const fieldSize = largestFieldSize(history);
  const isFaded = (playerId: string) => focusedId !== null && focusedId !== playerId;
  const headRoom = headRoomPx(frame.heads);

  const series: Highcharts.SeriesLineOptions[] = roster.map((player) => ({
    type: 'line',
    id: player.userId,
    name: player.userName,
    data: frame.dataByPlayer.get(player.userId) ?? [],
    lineWidth: focusedId === player.userId ? FOCUSED_LINE_WIDTH : LINE_WIDTH,
    opacity: isFaded(player.userId) ? FADED_OPACITY : 1,
    zIndex: focusedId === player.userId ? 2 : 1,
  }));

  const isCrowned = (playerId: string, x: number) => {
    const round = history[x]?.round;
    if (round === undefined) return false;
    return story.newLeadersByRound.get(round)?.has(playerId) ?? false;
  };

  const headFace = (playerId: string, x: number, style: { color?: string; faded: boolean }) => {
    const player = roster.find((entry) => entry.userId === playerId);
    const head = frame.heads.get(playerId);
    if (!player || !head || head.x !== x) return null;
    return raceHeadHtml({
      name: player.userName,
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
      spacingRight: headRoom,
      spacingTop: CROWN_CLEARANCE_PX + CROWN_HEIGHT_PX,
    },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories: history.map(({ round }) => `R${round}`),
      min: 0,
      max: finalRaceProgress(history),
      labels: { style: { color: AXIS_LABEL_COLOR } },
      lineColor: GRID_LINE_COLOR,
      tickLength: 0,
    },
    yAxis: {
      title: { text: undefined },
      reversed: true,
      min: 0.5,
      max: fieldSize + 0.5,
      startOnTick: false,
      endOnTick: false,
      tickInterval: 1,
      gridLineColor: GRID_LINE_COLOR,
      plotBands: positionBands(fieldSize),
      labels: {
        formatter() {
          const position = Number(this.value);
          const color = positionColor(position, fieldSize, fieldSize);
          return `<span style="color:${color};font-weight:600">${ordinal(position)}</span>`;
        },
      },
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
