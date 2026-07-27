import { NextRequest } from 'next/server';
import { signupSchema } from '@/lib/schemas/auth';
import { getUsers } from '@/lib/db/collections';
import { hashPassword } from '@/lib/auth/password';
import { signJwt } from '@/lib/auth/jwt';
import { rateLimit } from '@/lib/auth/rateLimit';
import { success, validationError, conflict, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';

const requestId = crypto.randomUUID();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  try {
    const body = await request.json();
    logApiRequest(requestId, '/api/auth/signup', null, { username: body.username });

    // Rate limit
    const limit = rateLimit('signup', ip, 5, 60 * 60 * 1000); // 5 per hour per IP
    if (!limit.allowed) {
      logApiResponse(requestId, 429, Date.now() - startTime);
      return error('Too many signup attempts. Try again later.', 'RATE_LIMITED', 429);
    }

    // Validate
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const data = parsed.data;
    const users = await getUsers();

    // Check uniqueness
    const existing = await users.findOne({
      $or: [
        { username: data.username.toLowerCase() },
        { email: data.email.toLowerCase() },
        { phone: data.phone },
      ],
    });

    if (existing) {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return conflict('Username, email, or phone already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const result = await users.insertOne({
      name: data.name,
      username: data.username.toLowerCase(),
      email: data.email.toLowerCase(),
      phone: data.phone,
      dob: data.dob,
      passwordHash,
      profilePicUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Sign JWT
    const token = await signJwt({
      userId: result.insertedId.toString(),
      email: data.email,
      username: data.username,
    });

    logApiResponse(requestId, 200, Date.now() - startTime);

    const response = success({
      user: {
        id: result.insertedId.toString(),
        name: data.name,
        username: data.username,
        email: data.email,
      },
    });

    // Set cookie
    response.cookies.set('auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
