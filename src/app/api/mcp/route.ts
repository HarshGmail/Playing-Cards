import { API_TOKEN_PREFIX, findUserIdForApiToken } from '@/lib/auth/apiTokens';
import { handleMcpRequest } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';

const BEARER_PREFIX = 'Bearer ';

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith(BEARER_PREFIX)) return null;
  const token = header.slice(BEARER_PREFIX.length).trim();
  return token.startsWith(API_TOKEN_PREFIX) ? token : null;
}

function unauthorized(): Response {
  return Response.json(
    {
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Send a Playing Cards token as: Authorization: Bearer <token>' },
      id: null,
    },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
  );
}

function methodNotAllowed(): Response {
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null },
    { status: 405, headers: { Allow: 'POST' } }
  );
}

export async function POST(request: Request) {
  const token = bearerToken(request);
  const userId = token ? await findUserIdForApiToken(token) : null;
  if (!userId) return unauthorized();
  return handleMcpRequest(request, { userId, origin: new URL(request.url).origin });
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
