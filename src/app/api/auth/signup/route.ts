import { signupSchema } from '@/lib/schemas/auth';
import { getUsers } from '@/lib/db/collections';
import { hashPassword } from '@/lib/auth/password';
import { signJwt } from '@/lib/auth/jwt';
import { success, conflict } from '@/lib/api/respond';
import { createHandler } from '@/lib/api/handler';

export const dynamic = 'force-dynamic';

export const POST = createHandler(
  async (_, data) => {
    const payload = data as typeof signupSchema._type;
    const users = await getUsers();

    const existing = await users.findOne({
      $or: [
        { username: payload.username.toLowerCase() },
        { email: payload.email.toLowerCase() },
        { phone: payload.phone },
      ],
    });

    if (existing) {
      return conflict('Username, email, or phone already registered');
    }

    const passwordHash = await hashPassword(payload.password);
    const result = await users.insertOne({
      name: payload.name,
      username: payload.username.toLowerCase(),
      email: payload.email.toLowerCase(),
      phone: payload.phone,
      dob: payload.dob,
      passwordHash,
      profilePicUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = await signJwt({
      userId: result.insertedId.toString(),
      email: payload.email,
      username: payload.username,
    });

    const response = success({
      user: {
        id: result.insertedId.toString(),
        name: payload.name,
        username: payload.username,
        email: payload.email,
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
  },
  {
    rateLimitKey: 'signup',
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,
    schema: signupSchema,
  }
);
