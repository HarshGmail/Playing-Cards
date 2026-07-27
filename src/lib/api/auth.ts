import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { unauthorized } from './respond';

export async function extractUserId(request: NextRequest): Promise<string | null> {
  // First try to get from middleware-set header (fastest path)
  const userIdFromHeader = request.headers.get('x-user-id');
  if (userIdFromHeader) {
    return userIdFromHeader;
  }

  // Fallback: verify JWT from cookie (for endpoints that bypass middleware)
  const token = request.cookies.get('auth')?.value;
  if (!token) {
    return null;
  }

  const payload = await verifyJwt(token);
  return payload?.userId || null;
}

export async function requireAuth(
  request: NextRequest
): Promise<{ userId: string } | Response> {
  const userId = await extractUserId(request);
  if (!userId) {
    return unauthorized();
  }
  return { userId };
}

export function getCurrentUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}
