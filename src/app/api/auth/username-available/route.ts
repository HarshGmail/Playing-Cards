import { NextRequest } from 'next/server';
import { getUsers } from '@/lib/db/collections';
import { success, validationError, error } from '@/lib/api/respond';
import { rateLimit } from '@/lib/auth/rateLimit';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const limit = rateLimit('username-available', ip, 20, 60 * 1000); // 20 per minute

  if (!limit.allowed) {
    return error('Too many requests', 'RATE_LIMITED', 429);
  }

  const username = request.nextUrl.searchParams.get('u');

  if (!username) {
    return validationError('Username parameter required');
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return validationError('Invalid username format');
  }

  try {
    const users = await getUsers();
    const existing = await users.findOne({ username: username.toLowerCase() });

    return success({
      available: !existing,
    });
  } catch {
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
