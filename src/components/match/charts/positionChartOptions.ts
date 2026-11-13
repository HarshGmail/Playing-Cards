import type Highcharts from 'highcharts';
import { ordinal } from '@/lib/domain/milestones';
import type { PositionRosterEntry, RoundPositions } from '@/lib/domain/positionHistory';
import type { PositionStory } from '@/lib/domain/positionStory';
import { playerFaceHtml, playerLabelHtml } from './playerLabel';
import type { PlayersById } from '@/types';

export type PositionChartLayout = 'down' | 'across';

export interface RaceHead {
  x: number;
  staggerPx: number;
}

export interface RaceFrame {
  dataByPlayer: Map<string, Highcharts.PointOptionsObject[]>;
  heads: Map<string, RaceHead>;
}

export interface PositionChartInput {
  history: RoundPositions[];
  story: PositionStory;
  roster: PositionRosterEntry[];
  playersById: PlayersById;
  focusedId: string | null;
  layout: PositionChartLayout;
  frame: RaceFrame;
  onToggleFocus: (playerId: string) => void;
}

const CROWN = '👑';
const HEAD_SIZE = 26;
const TIED_HEAD_STAGGER_PX = 16;
const CROWN_CLEARANCE_PX = HEAD_SIZE / 2 + 4;
const CROWN_HEIGHT_PX = 18;
const LINE_WIDTH = 3;
const FOCUSED_LINE_WIDTH = 5;
const FADED_OPACITY = 0.15;
const MIN_PLAYERS_FOR_LAST_PLACE = 4;
const ACROSS_HEIGHT = 340;
const DOWN_MIN_HEIGHT = 340;
const DOWN_BASE_HEIGHT = 130;
const DOWN_HEIGHT_PER_ROUND = 30;
const AXIS_LABEL_COLOR = '#9ca3af';
const GRID_LINE_COLOR = 'rgba(148, 163, 184, 0.2)';
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
  const playersAtSpot = new Map<string, number>();

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
      const spot = `${head.x}:${head.y}`;
      const alreadyThere = playersAtSpot.get(spot) ?? 0;
      playersAtSpot.set(spot, alreadyThere + 1);
      heads.set(player.userId, { x: head.x, staggerPx: alreadyThere * TIED_HEAD_STAGGER_PX });
    }
    dataByPlayer.set(player.userId, points);
  });

  return { dataByPlayer, heads };
}

function largestFieldSize(history: RoundPositions[]): number {
  return Math.max(1, ...history.flatMap((standing) => Array.from(standing.positions.values())));
}

function chartHeight(layout: PositionChartLayout, roundCount: number): number {
  if (layout === 'across') return ACROSS_HEIGHT;
  return Math.max(DOWN_MIN_HEIGHT, DOWN_BASE_HEIGHT + roundCount * DOWN_HEIGHT_PER_ROUND);
}

function positionBands(fieldSize: number): Highcharts.YAxisPlotBandsOptions[] {
  const leaderBand = { from: 0.5, to: 1.5, color: LEADER_BAND_COLOR };
  if (fieldSize < MIN_PLAYERS_FOR_LAST_PLACE) return [leaderBand];
  return [leaderBand, { from: fieldSize - 0.5, to: fieldSize + 0.5, color: LAST_PLACE_BAND_COLOR }];
}

function headRoomPx(history: RoundPositions[], roster: PositionRosterEntry[]): number {
  const finishHeads = buildRaceFrame(history, roster, finalRaceProgress(history)).heads;
  const widestStagger = Math.max(0, ...Array.from(finishHeads.values()).map((head) => head.staggerPx));
  return HEAD_SIZE / 2 + widestStagger + 6;
}

export function buildPositionChartOptions(input: PositionChartInput): Highcharts.Options {
  const { history, story, roster, playersById, focusedId, layout, frame, onToggleFocus } = input;
  const isDown = layout === 'down';
  const fieldSize = largestFieldSize(history);
  const playerById = new Map(roster.map((player) => [player.userId, player]));
  const isFaded = (playerId: string) => focusedId !== null && focusedId !== playerId;
  const headRoom = headRoomPx(history, roster);

  const series: Highcharts.SeriesLineOptions[] = roster.map((player) => ({
    type: 'line',
    id: player.userId,
    name: player.userName,
    data: frame.dataByPlayer.get(player.userId) ?? [],
    lineWidth: focusedId === player.userId ? FOCUSED_LINE_WIDTH : LINE_WIDTH,
    opacity: isFaded(player.userId) ? FADED_OPACITY : 1,
    zIndex: focusedId === player.userId ? 2 : 1,
  }));

  const crownLabel: Highcharts.DataLabelsOptions = {
    enabled: true,
    allowOverlap: true,
    crop: false,
    overflow: 'allow',
    style: { fontSize: '14px', textOutline: 'none' },
    ...(isDown
      ? { align: 'left', verticalAlign: 'middle', x: CROWN_CLEARANCE_PX, y: 0 }
      : { align: 'center', verticalAlign: 'bottom', x: 0, y: -CROWN_CLEARANCE_PX }),
    formatter() {
      const playerId = this.series.options.id;
      if (!playerId || isFaded(playerId) || !Number.isInteger(this.x)) return null;
      const round = history[this.x]?.round;
      if (round === undefined) return null;
      return story.newLeadersByRound.get(round)?.has(playerId) ? CROWN : null;
    },
  };

  const headLabel: Highcharts.DataLabelsOptions = {
    enabled: true,
    useHTML: true,
    allowOverlap: true,
    crop: false,
    overflow: 'allow',
    align: 'center',
    verticalAlign: 'middle',
    x: 0,
    y: 0,
    formatter() {
      const playerId = this.series.options.id;
      const player = playerId ? playerById.get(playerId) : undefined;
      const head = playerId ? frame.heads.get(playerId) : undefined;
      if (!player || !head || head.x !== this.x) return null;
      const opacity = isFaded(player.userId) ? `opacity:${FADED_OPACITY};` : '';
      return playerFaceHtml({
        name: player.userName,
        profilePicUrl: playersById[player.userId]?.profilePicUrl,
        size: HEAD_SIZE,
        ringColor: typeof this.series.color === 'string' ? this.series.color : undefined,
        extraStyle: `margin-left:${head.staggerPx}px;${opacity}`,
      });
    },
  };

  return {
    chart: {
      type: 'line',
      inverted: isDown,
      backgroundColor: 'transparent',
      height: chartHeight(layout, history.length),
      animation: false,
      ...(isDown
        ? { spacingBottom: headRoom }
        : { spacingRight: headRoom, spacingTop: CROWN_CLEARANCE_PX + CROWN_HEIGHT_PX }),
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
      opposite: isDown,
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
    legend: {
      useHTML: true,
      itemStyle: { color: AXIS_LABEL_COLOR },
      labelFormatter() {
        const player = playerById.get(String((this as Highcharts.Series).options.id));
        if (!player) return String((this as Highcharts.Series).name);
        return playerLabelHtml({
          name: player.userName,
          profilePicUrl: playersById[player.userId]?.profilePicUrl,
          size: 20,
          stacked: false,
        });
      },
    },
    plotOptions: {
      series: {
        animation: false,
        cursor: 'pointer',
        marker: { enabled: true, radius: 4 },
        dataLabels: [crownLabel, headLabel],
        events: {
          click() {
            if (this.options.id) onToggleFocus(this.options.id);
          },
          legendItemClick(event) {
            event.preventDefault();
            if (this.options.id) onToggleFocus(this.options.id);
          },
        },
      },
    },
    series,
  };
}
