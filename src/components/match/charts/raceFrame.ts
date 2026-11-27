import type Highcharts from 'highcharts';
import { playerFaceHtml } from './playerLabel';

export const CROWN = '👑';
export const HEAD_SIZE = 26;
export const TIED_HEAD_STAGGER_PX = 16;
export const CROWN_CLEARANCE_PX = HEAD_SIZE / 2 + 4;
export const CROWN_HEIGHT_PX = 18;
export const LINE_WIDTH = 3;
export const FOCUSED_LINE_WIDTH = 5;
export const FADED_OPACITY = 0.15;
export const AXIS_LABEL_COLOR = '#9ca3af';
export const GRID_LINE_COLOR = 'rgba(148, 163, 184, 0.2)';
const HEAD_HEADROOM_PX = 6;

export interface RaceHead {
  x: number;
  staggerPx: number;
}

export interface RaceFrame {
  dataByPlayer: Map<string, Highcharts.PointOptionsObject[]>;
  heads: Map<string, RaceHead>;
}

export interface RaceHeadStyle {
  color?: string;
  faded: boolean;
}

interface RaceLabelHooks {
  isFaded: (playerId: string) => boolean;
  isCrowned: (playerId: string, x: number) => boolean;
  headFace: (playerId: string, x: number, style: RaceHeadStyle) => string | null;
}

export function claimHeadSlot(claimed: Map<string, number>, x: number, y: number): number {
  const spot = `${x}:${y}`;
  const alreadyThere = claimed.get(spot) ?? 0;
  claimed.set(spot, alreadyThere + 1);
  return alreadyThere * TIED_HEAD_STAGGER_PX;
}

export function headRoomPx(heads: Map<string, RaceHead>): number {
  const widestStagger = Math.max(0, ...Array.from(heads.values()).map((head) => head.staggerPx));
  return HEAD_SIZE / 2 + widestStagger + HEAD_HEADROOM_PX;
}

export function raceHeadHtml({
  name,
  profilePicUrl,
  staggerPx,
  style,
}: {
  name: string;
  profilePicUrl?: string | null;
  staggerPx: number;
  style: RaceHeadStyle;
}): string {
  const fade = style.faded ? `opacity:${FADED_OPACITY};` : '';
  return playerFaceHtml({
    name,
    profilePicUrl,
    size: HEAD_SIZE,
    ringColor: style.color,
    extraStyle: `margin-left:${staggerPx}px;${fade}`,
  });
}

export function raceDataLabels({
  isFaded,
  isCrowned,
  headFace,
}: RaceLabelHooks): Highcharts.DataLabelsOptions[] {
  const crown: Highcharts.DataLabelsOptions = {
    enabled: true,
    allowOverlap: true,
    crop: false,
    overflow: 'allow',
    style: { fontSize: '14px', textOutline: 'none' },
    align: 'center',
    verticalAlign: 'bottom',
    x: 0,
    y: -CROWN_CLEARANCE_PX,
    formatter() {
      const playerId = this.series.options.id;
      if (!playerId || isFaded(playerId) || !Number.isInteger(this.x)) return null;
      return isCrowned(playerId, this.x) ? CROWN : null;
    },
  };

  const head: Highcharts.DataLabelsOptions = {
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
      if (!playerId || !Number.isInteger(this.x)) return null;
      const color = typeof this.series.color === 'string' ? this.series.color : undefined;
      return headFace(playerId, this.x, { color, faded: isFaded(playerId) });
    },
  };

  return [crown, head];
}
