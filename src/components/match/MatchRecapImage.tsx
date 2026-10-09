import type { MatchRecapView } from '@/lib/stats/matchRecap';
import type { PodiumSlot, RecapPlayer } from '@/lib/domain/matchRecap';
import { APP_TIME_ZONE } from '@/lib/domain/streaks';

export const RECAP_WIDTH = 1080;
const HEADER_HEIGHT = 470;
const PODIUM_HEIGHT = 400;
const HIGHLIGHTS_HEIGHT = 230;
const STANDINGS_HEADER_HEIGHT = 90;
const STANDING_ROW_HEIGHT = 76;
const FOOTER_HEIGHT = 120;
export const MAX_STANDING_ROWS = 10;
const WINNER_FONT_SIZE = 88;
const JOINT_WINNER_FONT_SIZE = 60;

const COLORS = {
  background: '#0b1120',
  card: '#151e32',
  border: '#24304a',
  text: '#f8fafc',
  muted: '#94a3b8',
  gain: '#4ade80',
  loss: '#f87171',
};

const PODIUM_COLORS: Record<number, string> = {
  1: '#741ce9',
  2: '#22c95f',
  3: '#facc14',
};

const PODIUM_LABEL_COLORS: Record<number, string> = {
  1: COLORS.text,
  2: COLORS.background,
  3: COLORS.background,
};

const PODIUM_BLOCK_HEIGHTS: Record<number, number> = { 1: 220, 2: 160, 3: 110 };
const PODIUM_DISPLAY_ORDER = [2, 1, 3];

export function recapHeight(view: MatchRecapView): number {
  const rows = Math.min(view.recap.players.length, MAX_STANDING_ROWS);
  const highlights =
    view.recap.longestGameStreak || view.recap.biggestRound ? HIGHLIGHTS_HEIGHT : 0;
  return (
    HEADER_HEIGHT +
    PODIUM_HEIGHT +
    highlights +
    STANDINGS_HEADER_HEIGHT +
    rows * STANDING_ROW_HEIGHT +
    FOOTER_HEIGHT
  );
}

function formatEndedAt(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: APP_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDelta(delta: number | null): string {
  if (delta === null) return '–';
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function deltaColor(delta: number | null): string {
  if (delta === null || delta === 0) return COLORS.muted;
  return delta > 0 ? COLORS.gain : COLORS.loss;
}

function joinNames(players: RecapPlayer[]): string {
  return players.map((p) => p.name).join(' & ');
}

function Header({ view }: { view: MatchRecapView }) {
  const { winners } = view.recap;
  const winnerDelta = winners.length === 1 ? winners[0].ratingDelta : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '64px 64px 0' }}>
      <div style={{ display: 'flex', fontSize: 28, color: COLORS.muted }}>
        {`${view.gameName} · ${view.roundsPlayed} rounds · ${formatEndedAt(view.endedAt)}`}
      </div>
      <div style={{ display: 'flex', fontSize: 56, color: COLORS.text, marginTop: 12 }}>
        {view.matchName}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 26,
          letterSpacing: 6,
          color: PODIUM_COLORS[1],
          marginTop: 56,
        }}
      >
        {winners.length > 1 ? 'JOINT WINNERS' : 'WINNER'}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: winners.length > 1 ? JOINT_WINNER_FONT_SIZE : WINNER_FONT_SIZE,
          color: COLORS.text,
          marginTop: 4,
        }}
      >
        {winners.length > 0 ? joinNames(winners) : 'No winner'}
      </div>
      {winners.length > 0 && (
        <div style={{ display: 'flex', fontSize: 32, color: COLORS.muted, marginTop: 8 }}>
          {`${winners[0].total} points`}
          {winnerDelta !== null && (
            <span style={{ color: deltaColor(winnerDelta), marginLeft: 20 }}>
              {`${formatDelta(winnerDelta)} rating`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function PodiumColumn({ slot }: { slot: PodiumSlot }) {
  const color = PODIUM_COLORS[slot.rank];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 300,
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 32,
          color: COLORS.text,
          textAlign: 'center',
          marginBottom: 6,
        }}
      >
        {joinNames(slot.players)}
      </div>
      <div style={{ display: 'flex', fontSize: 24, color: COLORS.muted, marginBottom: 16 }}>
        {`${slot.players[0].total} pts`}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          width: '100%',
          height: PODIUM_BLOCK_HEIGHTS[slot.rank],
          backgroundColor: color,
          borderRadius: '16px 16px 0 0',
          paddingTop: 16,
          fontSize: 64,
          color: PODIUM_LABEL_COLORS[slot.rank],
        }}
      >
        {`${slot.rank}`}
      </div>
    </div>
  );
}

function Podium({ podium }: { podium: PodiumSlot[] }) {
  const slots = PODIUM_DISPLAY_ORDER.map((rank) => podium.find((s) => s.rank === rank)).filter(
    (slot): slot is PodiumSlot => !!slot
  );
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 24,
        height: PODIUM_HEIGHT,
        padding: '0 64px',
        borderBottom: `2px solid ${COLORS.border}`,
      }}
    >
      {slots.map((slot) => (
        <PodiumColumn key={slot.rank} slot={slot} />
      ))}
    </div>
  );
}

function HighlightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        padding: '28px 32px',
        backgroundColor: COLORS.card,
        border: `2px solid ${COLORS.border}`,
        borderRadius: 24,
      }}
    >
      <div style={{ display: 'flex', fontSize: 24, letterSpacing: 3, color: COLORS.muted }}>
        {label}
      </div>
      <div style={{ display: 'flex', fontSize: 52, color: COLORS.text, marginTop: 8 }}>
        {value}
      </div>
      <div style={{ display: 'flex', fontSize: 26, color: COLORS.muted, marginTop: 4 }}>
        {detail}
      </div>
    </div>
  );
}

function Highlights({ view }: { view: MatchRecapView }) {
  const { longestGameStreak, biggestRound } = view.recap;
  if (!longestGameStreak && !biggestRound) return null;
  return (
    <div style={{ display: 'flex', gap: 24, height: HIGHLIGHTS_HEIGHT, padding: '40px 64px 0' }}>
      {longestGameStreak && (
        <HighlightCard
          label="LONGEST STREAK"
          value={`${longestGameStreak.length} in a row`}
          detail={joinNames(longestGameStreak.players)}
        />
      )}
      {biggestRound && (
        <HighlightCard
          label="BIGGEST ROUND"
          value={`${biggestRound.value} pts`}
          detail={`${biggestRound.player.name} · round ${biggestRound.round}`}
        />
      )}
    </div>
  );
}

function StandingRow({ player }: { player: RecapPlayer }) {
  const rankColor = player.isDnf ? COLORS.muted : PODIUM_COLORS[player.rank] ?? COLORS.muted;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: STANDING_ROW_HEIGHT,
        fontSize: 32,
        color: player.isDnf ? COLORS.muted : COLORS.text,
        borderBottom: `2px solid ${COLORS.border}`,
      }}
    >
      <div style={{ display: 'flex', width: 90, color: rankColor }}>
        {player.isDnf ? 'DNF' : `#${player.rank}`}
      </div>
      <div style={{ display: 'flex', flex: 1 }}>{player.name}</div>
      <div style={{ display: 'flex', width: 160, justifyContent: 'flex-end' }}>
        {`${player.total}`}
      </div>
      <div
        style={{
          display: 'flex',
          width: 160,
          justifyContent: 'flex-end',
          color: deltaColor(player.ratingDelta),
        }}
      >
        {formatDelta(player.ratingDelta)}
      </div>
    </div>
  );
}

function Standings({ players }: { players: RecapPlayer[] }) {
  const shown = players.slice(0, MAX_STANDING_ROWS);
  const hiddenCount = players.length - shown.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '0 64px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          height: STANDINGS_HEADER_HEIGHT,
          paddingBottom: 12,
          fontSize: 24,
          letterSpacing: 3,
          color: COLORS.muted,
          borderBottom: `2px solid ${COLORS.border}`,
        }}
      >
        <div style={{ display: 'flex', flex: 1 }}>
          {hiddenCount > 0 ? `STANDINGS (TOP ${shown.length})` : 'STANDINGS'}
        </div>
        <div style={{ display: 'flex', width: 160, justifyContent: 'flex-end' }}>POINTS</div>
        <div style={{ display: 'flex', width: 160, justifyContent: 'flex-end' }}>RATING</div>
      </div>
      {shown.map((player) => (
        <StandingRow key={player.playerId} player={player} />
      ))}
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: FOOTER_HEIGHT,
        marginTop: 'auto',
        fontSize: 26,
        letterSpacing: 4,
        color: COLORS.muted,
      }}
    >
      PLAYING CARDS
    </div>
  );
}

export default function MatchRecapImage({ view }: { view: MatchRecapView }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.background,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: HEADER_HEIGHT,
          overflow: 'hidden',
        }}
      >
        <Header view={view} />
      </div>
      <Podium podium={view.recap.podium} />
      <Highlights view={view} />
      <Standings players={view.recap.players} />
      <Footer />
    </div>
  );
}
