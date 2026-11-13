import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/matches/service', () => ({
  createMatch: vi.fn(),
  endMatch: vi.fn(),
  findUsersByUsername: vi.fn(async () => []),
  getActiveRoster: vi.fn(),
  getMatchStandings: vi.fn(),
  listFriends: vi.fn(async () => []),
  listUserMatches: vi.fn(),
  submitRound: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({ logError: vi.fn() }));

const { handleMcpRequest } = await import('./server');

const EXPECTED_TOOLS = [
  'list_friends',
  'create_match',
  'add_round',
  'get_standings',
  'list_my_matches',
  'end_match',
];

function rpc(method: string, params: Record<string, unknown> = {}): Request {
  return new Request('https://app.test/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
}

const CONTEXT = { userId: 'user-1', origin: 'https://app.test' };

describe('MCP server', () => {
  it('lists every Ved tool with a description and a schema', async () => {
    const response = await handleMcpRequest(rpc('tools/list'), CONTEXT);
    const body = await response.json();
    const names = body.result.tools.map((tool: { name: string }) => tool.name);

    expect(names.sort()).toEqual([...EXPECTED_TOOLS].sort());
    for (const tool of body.result.tools) {
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('returns a tool error, not a crash, when a username is unknown', async () => {
    const response = await handleMcpRequest(
      rpc('tools/call', {
        name: 'add_round',
        arguments: { match_id: 'm1', scores: { ghost: 5 } },
      }),
      CONTEXT
    );
    const body = await response.json();

    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toBe('Unknown username: ghost');
  });
});
