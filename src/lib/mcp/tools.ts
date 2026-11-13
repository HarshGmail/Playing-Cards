import { z } from 'zod';
import { createMatchSchema, MAX_TARGET_ROUNDS } from '@/lib/schemas/match';
import {
  createMatch,
  endMatch,
  findUsersByUsername,
  getActiveRoster,
  getMatchStandings,
  listFriends,
  listUserMatches,
  MatchPlayer,
  MatchStandingsView,
  StandingRow,
  submitRound,
} from '@/lib/matches/service';

export class McpToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpToolError';
  }
}

export interface ToolContext {
  userId: string;
  origin: string;
}

export interface RegisteredTool {
  description: string;
  inputSchema: z.ZodRawShape;
  handler(context: ToolContext, args: unknown): Promise<unknown>;
}

interface ToolDefinition<Shape extends z.ZodRawShape> {
  description: string;
  inputSchema: Shape;
  handler: (context: ToolContext, args: z.infer<z.ZodObject<Shape>>) => Promise<unknown>;
}

function defineTool<Shape extends z.ZodRawShape>(definition: ToolDefinition<Shape>): ToolDefinition<Shape> {
  return definition;
}

const LEAST_COUNT_TIEBREAKERS = ['more-consistent', 'lower-average', 'less-consistent'];
const MAX_MATCH_PLAYERS = 20;
const MAX_ROUND_SCORE = 99999;
const DEFAULT_MATCH_LIST_LIMIT = 10;
const MAX_MATCH_LIST_LIMIT = 50;

const usernameParam = z.string().trim().min(1).max(50).describe('Playing Cards username, as listed by list_friends');
const matchIdParam = z.string().min(1).describe('Match id, from create_match or list_my_matches');

function normaliseUsername(value: string): string {
  return value.trim().toLowerCase();
}

function requireKnownUsernames(requested: string[], found: MatchPlayer[]): void {
  const known = new Set(found.map((player) => player.username));
  const unknown = requested.filter((username) => !known.has(username));
  if (unknown.length > 0) {
    throw new McpToolError(`Unknown username: ${unknown.join(', ')}`);
  }
}

function defaultMatchName(): string {
  return `Card night ${new Date().toISOString().slice(0, 10)}`;
}

function playerJson(player: MatchPlayer) {
  return { username: player.username, name: player.name };
}

function standingJson(row: StandingRow) {
  return {
    position: row.position,
    username: row.player.username,
    name: row.player.name,
    total: row.total,
    games_won: row.gamesWon,
    rounds_played: row.roundsPlayed,
    dnf: row.isDnf,
  };
}

function winChancesJson(view: MatchStandingsView) {
  if (!view.winForecast) return null;
  const usernameById = new Map(view.standings.map((row) => [row.player.userId, row.player.username]));
  return {
    target_rounds: view.winForecast.targetRounds,
    games_played: view.winForecast.gamesPlayed,
    remaining_games: view.winForecast.remainingGames,
    players: view.winForecast.players.map((player) => ({
      username: usernameById.get(player.playerId) ?? '',
      win_chance_pct: Math.round(player.winProbability * 100),
    })),
  };
}

export const mcpTools = {
  list_friends: defineTool({
    description: 'List your Playing Cards friends who can be added to a match. Returns usernames and display names.',
    inputSchema: {},
    handler: async ({ userId }) => {
      const friends = await listFriends(userId);
      return { friends: friends.map(playerJson) };
    },
  }),

  create_match: defineTool({
    description:
      'Create a card night match and invite players by username. Each invitee must accept in Playing Cards before rounds can be scored. Least Count: lowest total wins.',
    inputSchema: {
      players: z
        .array(usernameParam)
        .min(1)
        .max(MAX_MATCH_PLAYERS)
        .describe('Usernames to invite. You are added automatically.'),
      target_rounds: z
        .number()
        .int()
        .min(1)
        .max(MAX_TARGET_ROUNDS)
        .optional()
        .describe('Planned number of rounds. Enables win chances.'),
      name: z.string().trim().min(3).max(50).optional().describe('Match name. Defaults to "Card night" and today’s date.'),
    },
    handler: async ({ userId, origin }, args) => {
      const requested = args.players.map(normaliseUsername);
      const invitees = await findUsersByUsername(requested);
      requireKnownUsernames(requested, invitees);

      const input = createMatchSchema.parse({
        name: args.name ?? defaultMatchName(),
        creatorRole: 'score-and-play',
        rankPreference: 'lowest-first',
        gameType: 'least-count',
        tiebreakers: LEAST_COUNT_TIEBREAKERS,
        players: invitees.map((player) => player.userId),
        spectatorIds: [],
        targetRounds: args.target_rounds ?? null,
      });
      const created = await createMatch(userId, input);

      return {
        match_id: created.id,
        name: created.name,
        match_url: `${origin}/matches/${created.id}`,
        invited: invitees.map(playerJson),
        pending_invites: created.invitedCount,
      };
    },
  }),

  add_round: defineTool({
    description:
      'Add one round’s scores to a match you created. Every active player needs a score. Least Count: lower is better. Returns the round number and standings.',
    inputSchema: {
      match_id: matchIdParam,
      scores: z
        .record(usernameParam, z.number().int().min(0).max(MAX_ROUND_SCORE))
        .describe('Each active player’s score for this round, keyed by username'),
    },
    handler: async ({ userId }, args) => {
      const scoreByUsername = new Map(
        Object.entries(args.scores).map(([username, value]) => [normaliseUsername(username), value])
      );
      const requested = Array.from(scoreByUsername.keys());
      const scorers = await findUsersByUsername(requested);
      requireKnownUsernames(requested, scorers);

      const roster = await getActiveRoster(args.match_id, userId);
      const missing = roster.filter((player) => !scoreByUsername.has(player.username));
      if (missing.length > 0) {
        throw new McpToolError(`Missing a score for: ${missing.map((player) => player.username).join(', ')}`);
      }

      const notPlaying = scorers.filter((scorer) => !roster.some((player) => player.userId === scorer.userId));
      if (notPlaying.length > 0) {
        throw new McpToolError(
          `Not an active player in this match: ${notPlaying.map((scorer) => scorer.username).join(', ')}`
        );
      }

      const round = await submitRound({
        matchId: args.match_id,
        userId,
        scores: scorers.map((scorer) => ({
          playerId: scorer.userId,
          value: scoreByUsername.get(scorer.username) ?? 0,
        })),
      });
      const view = await getMatchStandings({ matchId: args.match_id, userId, withWinForecast: false });

      return {
        match_id: round.matchId,
        round: round.round,
        standings: view.standings.map(standingJson),
      };
    },
  }),

  get_standings: defineTool({
    description:
      'Get a match leaderboard: positions, totals, games won and rounds played. When the match has a planned round count, also returns win chances. Least Count: lowest total is first.',
    inputSchema: {
      match_id: matchIdParam,
    },
    handler: async ({ userId }, args) => {
      const view = await getMatchStandings({ matchId: args.match_id, userId, withWinForecast: true });
      return {
        match_id: view.id,
        name: view.name,
        status: view.status,
        rounds_played: view.roundsPlayed,
        target_rounds: view.targetRounds,
        standings: view.standings.map(standingJson),
        win_chances: winChancesJson(view),
      };
    },
  }),

  list_my_matches: defineTool({
    description: 'List matches you created or play in, newest first.',
    inputSchema: {
      status: z.enum(['active', 'ended']).default('active').describe('Which matches to list'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(MAX_MATCH_LIST_LIMIT)
        .default(DEFAULT_MATCH_LIST_LIMIT)
        .describe('How many matches to return'),
    },
    handler: async ({ userId }, args) => {
      const matches = await listUserMatches({ userId, status: args.status, limit: args.limit });
      return {
        matches: matches.map((match) => ({
          match_id: match.id,
          name: match.name,
          status: match.status,
          rounds_played: match.roundsPlayed,
          created_at: match.createdAt.toISOString(),
          ended_at: match.endedAt ? match.endedAt.toISOString() : null,
          players: match.players,
        })),
      };
    },
  }),

  end_match: defineTool({
    description:
      'End a match you created. Players receive their results and the final standings are returned. Only the creator can end a match.',
    inputSchema: {
      match_id: matchIdParam,
    },
    handler: async ({ userId }, args) => {
      const ended = await endMatch({ matchId: args.match_id, userId });
      const view = await getMatchStandings({ matchId: args.match_id, userId, withWinForecast: false });
      return {
        match_id: ended.matchId,
        status: ended.status,
        ended_at: ended.endedAt.toISOString(),
        standings: view.standings.map(standingJson),
      };
    },
  }),
};

export type McpToolName = keyof typeof mcpTools;
