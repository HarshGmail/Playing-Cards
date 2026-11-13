import type Highcharts from 'highcharts';
import { ordinal } from '@/lib/domain/milestones';
import type { PositionRosterEntry, RoundPositions } from '@/lib/domain/positionHistory';
import type { PositionStory } from '@/lib/domain/positionStory';
import { playerFaceHtml, playerLabelHtml } from './playerLabel';
import type { PlayersById } from '@/types';

export type PositionChartLayout = 'down' | 'across';

export interface PositionChartInput {
  history: RoundPositions[];
  story: PositionStory;
  roster: PositionRosterEntry[];
  playersById: PlayersById;
  focusedId: string | null;
  layout: PositionChartLayout;
  animationDuration: number | false;
  onToggleFocus: (playerId: string) => void;
}

const CROWN = '👑';
const END_AVATAR_SIZE = 22;
const END_AVATAR_GAP_PX = 10;
const TIED_AVATAR_STAGGER_PX = 14;
const LINE_WIDTH = 3;
const FOCUSED_LINE_WIDTH = 5;
const FADED_OPACITY = 0.15;
const MIN_PLAYERS_FOR_LAST_PLACE = 4;
const ACROSS_HEIGHT = 340;
const DOWN_MIN_HEIGHT = 340;
const DOWN_BASE_HEIGHT = 150;
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

interface LineEnd {
  index: number;
  staggerPx: number;
}

function lineEnds(history: RoundPositions[], roster: PositionRosterEntry[]): Map<string, LineEnd> {
  const finalIndex = history.length - 1;
  const ends = new Map<string, LineEnd>();
  const tiedAtFinish = new Map<number, number>();

  roster.forEach((player) => {
    let index = finalIndex;
    while (index >= 0 && !history[index].positions.has(player.userId)) index--;
    if (index < 0) return;

    let staggerPx = 0;
    if (index === finalIndex) {
      const position = history[index].positions.get(player.userId) ?? 0;
      const alreadyThere = tiedAtFinish.get(position) ?? 0;
      tiedAtFinish.set(position, alreadyThere + 1);
      staggerPx = alreadyThere * TIED_AVATAR_STAGGER_PX;
    }
    ends.set(player.userId, { index, staggerPx });
  });

  return ends;
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

export function buildPositionChartOptions(input: PositionChartInput): Highcharts.Options {
  const { history, story, roster, playersById, focusedId, layout, animationDuration, onToggleFocus } =
    input;
  const isDown = layout === 'down';
  const fieldSize = largestFieldSize(history);
  const ends = lineEnds(history, roster);
  const maxStaggerPx = Math.max(0, ...Array.from(ends.values()).map((end) => end.staggerPx));
  const endLabelRoom = END_AVATAR_SIZE + END_AVATAR_GAP_PX + maxStaggerPx + 8;
  const playerById = new Map(roster.map((player) => [player.userId, player]));
  const isFaded = (playerId: string) => focusedId !== null && focusedId !== playerId;
  const animation = animationDuration === false ? false : { duration: animationDuration };

  const series: Highcharts.SeriesLineOptions[] = roster.map((player) => ({
    type: 'line',
    id: player.userId,
    name: player.userName,
    data: history.map(({ positions }) => positions.get(player.userId) ?? null),
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
    ...(isDown ? { align: 'left', verticalAlign: 'middle', x: 8, y: 0 } : { y: -6 }),
    formatter() {
      const playerId = this.series.options.id;
      const round = history[this.index]?.round;
      if (!playerId || round === undefined) return null;
      if (isFaded(playerId)) return null;
      return story.newLeadersByRound.get(round)?.has(playerId) ? CROWN : null;
    },
  };

  const endAvatarLabel: Highcharts.DataLabelsOptions = {
    enabled: true,
    useHTML: true,
    allowOverlap: true,
    crop: false,
    overflow: 'allow',
    ...(isDown
      ? { align: 'center', verticalAlign: 'top', y: END_AVATAR_GAP_PX, x: 0 }
      : { align: 'left', verticalAlign: 'middle', x: END_AVATAR_GAP_PX, y: 0 }),
    formatter() {
      const playerId = this.series.options.id;
      const player = playerId ? playerById.get(playerId) : undefined;
      const end = playerId ? ends.get(playerId) : undefined;
      if (!player || !end || end.index !== this.index) return null;
      const opacity = isFaded(player.userId) ? `opacity:${FADED_OPACITY};` : '';
      return playerFaceHtml({
        name: player.userName,
        profilePicUrl: playersById[player.userId]?.profilePicUrl,
        size: END_AVATAR_SIZE,
        ringColor: typeof this.series.color === 'string' ? this.series.color : undefined,
        extraStyle: `margin-left:${end.staggerPx}px;${opacity}`,
      });
    },
  };

  return {
    chart: {
      type: 'line',
      inverted: isDown,
      backgroundColor: 'transparent',
      height: chartHeight(layout, history.length),
      ...(isDown ? {} : { spacingRight: endLabelRoom }),
    },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories: history.map(({ round }) => `R${round}`),
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
        return standingsTooltipHtml(input, this.index);
      },
    },
    legend: {
      useHTML: true,
      itemStyle: { color: AXIS_LABEL_COLOR },
      ...(isDown ? { margin: endLabelRoom } : {}),
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
        animation,
        cursor: 'pointer',
        marker: { enabled: true, radius: 4 },
        dataLabels: [crownLabel, endAvatarLabel],
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
