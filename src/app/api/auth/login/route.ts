import { loginSchema } from '@/lib/schemas/auth';
import { getUsers } from '@/lib/db/collections';
import { comparePasswords } from '@/lib/auth/password';
import { signJwt } from '@/lib/auth/jwt';
import { success, error } from '@/lib/api/respond';
import { createHandler } from '@/lib/api/handler';

export const dynamic = 'force-dynamic';

export const POST = createHandler(
  async (_, data) => {
    const { identifier, password } = data as typeof loginSchema._type;
    const users = await getUsers();

    const user = await users.findOne({
      $or: [
        { username: identifier.toLowerCase() },
        { email: identifier.toLowerCase() },
      ],
    });

    if (!user) {
      return error('Invalid credentials', 'INVALID_CREDENTIALS', 401);
    }

    const valid = await comparePasswords(password, user.passwordHash);
    if (!valid) {
      return error('Invalid credentials', 'INVALID_CREDENTIALS', 401);
    }

    const token = await signJwt({
      userId: user._id!.toString(),
      email: user.email,
      username: user.username,
    });

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
  },
  {
    rateLimitKey: 'login',
    maxAttempts: 10,
    windowMs: 15 * 60 * 1000,
    schema: loginSchema,
  }
);
