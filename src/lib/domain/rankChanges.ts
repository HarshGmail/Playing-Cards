export interface RankedPlayer {
  playerId: string;
  position: number;
  isDnf: boolean;
}

export interface RankChange {
  playerId: string;
  from: number | null;
  to: number;
  delta: number;
  enteredTop3: boolean;
  leftTop3: boolean;
  isNewLeader: boolean;
}

export type RankChanges = Map<string, RankChange>;

const PODIUM_SIZE = 3;
const LEADER_POSITION = 1;

function isOnPodium(player: RankedPlayer | undefined): boolean {
  return !!player && !player.isDnf && player.position <= PODIUM_SIZE;
}

function isLeading(player: RankedPlayer | undefined): boolean {
  return !!player && !player.isDnf && player.position === LEADER_POSITION;
}

export function computeRankChanges(
  previous: readonly RankedPlayer[],
  current: readonly RankedPlayer[]
): RankChanges {
  const previousById = new Map(previous.map((player) => [player.playerId, player]));
  const changes: RankChanges = new Map();

  for (const player of current) {
    const before = previousById.get(player.playerId);
    const from = before ? before.position : null;
    changes.set(player.playerId, {
      playerId: player.playerId,
      from,
      to: player.position,
      delta: from === null ? 0 : from - player.position,
      enteredTop3: !isOnPodium(before) && isOnPodium(player) && before !== undefined,
      leftTop3: isOnPodium(before) && !isOnPodium(player),
      isNewLeader: before !== undefined && !isLeading(before) && isLeading(player),
    });
  }

  return changes;
}

export function rankOrderSignature(players: readonly RankedPlayer[]): string {
  return players
    .map((player) => `${player.playerId}:${player.position}${player.isDnf ? 'd' : ''}`)
    .join('|');
}

export function hasRankMovement(changes: RankChanges): boolean {
  for (const change of changes.values()) {
    if (change.delta !== 0 || change.enteredTop3 || change.leftTop3 || change.isNewLeader) {
      return true;
    }
  }
  return false;
}
