import { NextRequest } from 'next/server';
import { loginSchema } from '@/lib/schemas/auth';
import { getUsers } from '@/lib/db/collections';
import { comparePasswords } from '@/lib/auth/password';
import { signJwt } from '@/lib/auth/jwt';
import { rateLimit } from '@/lib/auth/rateLimit';
import { success, validationError, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const requestId = crypto.randomUUID?.() || Date.now().toString();

  try {
    const body = await request.json();
    logApiRequest(requestId, '/api/auth/login', null);

    const limit = rateLimit('login', ip, 10, 15 * 60 * 1000); // 10 per 15 min
    if (!limit.allowed) {
      logApiResponse(requestId, 429, Date.now() - startTime);
      return error('Too many login attempts. Try again later.', 'RATE_LIMITED', 429);
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const { identifier, password } = parsed.data;
    const users = await getUsers();

    const user = await users.findOne({
      $or: [
        { username: identifier.toLowerCase() },
        { email: identifier.toLowerCase() },
      ],
    });

    if (!user) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return error('Invalid credentials', 'INVALID_CREDENTIALS', 401);
    }

    const valid = await comparePasswords(password, user.passwordHash);
    if (!valid) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return error('Invalid credentials', 'INVALID_CREDENTIALS', 401);
    }

    const token = await signJwt({
      userId: user._id!.toString(),
      email: user.email,
      username: user.username,
    });

    logApiResponse(requestId, 200, Date.now() - startTime);

    const response = success({
      user: {
        id: user._id!.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
      },
    });

    response.cookies.set('auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
