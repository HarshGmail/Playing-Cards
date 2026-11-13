import { describe, it, expect, vi, beforeEach } from 'vitest';

const findUserIdForApiToken = vi.fn();
const handleMcpRequest = vi.fn();

vi.mock('@/lib/auth/apiTokens', () => ({
  API_TOKEN_PREFIX: 'pc_',
  findUserIdForApiToken: (token: string) => findUserIdForApiToken(token),
}));

vi.mock('@/lib/mcp/server', () => ({
  handleMcpRequest: (request: Request, context: unknown) => handleMcpRequest(request, context),
}));

const { POST, GET, DELETE } = await import('./route');

const VALID_TOKEN = 'pc_' + 'a'.repeat(43);

function mcpRequest(authorization?: string): Request {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  };
  if (authorization !== undefined) headers.authorization = authorization;
  return new Request('https://app.test/api/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
}

describe('POST /api/mcp authentication', () => {
  beforeEach(() => {
    findUserIdForApiToken.mockReset();
    handleMcpRequest.mockReset();
    handleMcpRequest.mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('answers 401 when no token is sent', async () => {
    const response = await POST(mcpRequest());
    expect(response.status).toBe(401);
    expect(findUserIdForApiToken).not.toHaveBeenCalled();
    expect(handleMcpRequest).not.toHaveBeenCalled();
  });

  it('answers 401 for a header that is not a bearer token', async () => {
    const response = await POST(mcpRequest(`Basic ${VALID_TOKEN}`));
    expect(response.status).toBe(401);
    expect(handleMcpRequest).not.toHaveBeenCalled();
  });

  it('answers 401 for a wrong token without asking the database', async () => {
    const response = await POST(mcpRequest('Bearer nope'));
    expect(response.status).toBe(401);
    expect(findUserIdForApiToken).not.toHaveBeenCalled();
  });

  it('answers 401 for a well-formed token that is unknown or revoked', async () => {
    findUserIdForApiToken.mockResolvedValue(null);
    const response = await POST(mcpRequest(`Bearer ${VALID_TOKEN}`));
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
    expect(handleMcpRequest).not.toHaveBeenCalled();
  });

  it('serves the request as the token owner', async () => {
    findUserIdForApiToken.mockResolvedValue('user-1');
    const response = await POST(mcpRequest(`Bearer ${VALID_TOKEN}`));
    expect(response.status).toBe(200);
    expect(findUserIdForApiToken).toHaveBeenCalledWith(VALID_TOKEN);
    expect(handleMcpRequest).toHaveBeenCalledWith(expect.any(Request), {
      userId: 'user-1',
      origin: 'https://app.test',
    });
  });

  it('rejects GET and DELETE with 405', async () => {
    expect((await GET()).status).toBe(405);
    expect((await DELETE()).status).toBe(405);
  });
});
