import { resetPasswordSchema } from '@/lib/schemas/auth';
import { getUsers } from '@/lib/db/collections';
import { hashPassword } from '@/lib/auth/password';
import { verifyJwt } from '@/lib/auth/jwt';
import { success, unauthorized } from '@/lib/api/respond';
import { createHandler } from '@/lib/api/handler';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export const POST = createHandler(
  async (req, data) => {
    const { password } = data as typeof resetPasswordSchema._type;

    const resetToken = req.cookies.get('reset')?.value;
    if (!resetToken) {
      return unauthorized();
    }

    const payload = await verifyJwt(resetToken);
    if (!payload || payload.purpose !== 'password-reset') {
      return unauthorized();
    }

    const passwordHash = await hashPassword(password);
    const users = await getUsers();
    await users.updateOne(
      { _id: new ObjectId(payload.userId) },
      { $set: { passwordHash, updatedAt: new Date() } }
    );

    const response = success({ reset: true });
    // Single-use: clear the reset cookie so it can't be replayed from the browser.
    response.cookies.set('reset', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  },
  {
    rateLimitKey: 'recover-reset',
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    schema: resetPasswordSchema,
  }
);
