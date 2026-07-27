import { recoverIdentitySchema } from '@/lib/schemas/auth';
import { getUsers } from '@/lib/db/collections';
import { signJwt } from '@/lib/auth/jwt';
import { rateLimit } from '@/lib/auth/rateLimit';
import { success, error } from '@/lib/api/respond';
import { createHandler } from '@/lib/api/handler';

export const POST = createHandler(
  async (_, data) => {
    const { username, email, phone, dob } = data as typeof recoverIdentitySchema._type;
    const usernameKey = username.toLowerCase();

    // Separate lockout per username (on top of the per-IP limit below) so an
    // attacker can't spray identity guesses for one victim from many IPs.
    const userLimit = rateLimit('recover-verify-user', usernameKey, 5, 15 * 60 * 1000);
    if (!userLimit.allowed) {
      return error('Verification failed', 'VERIFICATION_FAILED', 401);
    }

    const users = await getUsers();
    const user = await users.findOne({
      username: usernameKey,
      email: email.toLowerCase(),
      phone,
      dob,
    });

    // Same generic error for every failure mode — never reveal which field was wrong.
    if (!user) {
      return error('Verification failed', 'VERIFICATION_FAILED', 401);
    }

    const resetToken = await signJwt(
      {
        userId: user._id!.toString(),
        email: user.email,
        username: user.username,
        purpose: 'password-reset',
      },
      '10m'
    );

    const response = success({ verified: true });
    response.cookies.set('reset', resetToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60,
      path: '/',
    });

    return response;
  },
  {
    rateLimitKey: 'recover-verify',
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    schema: recoverIdentitySchema,
  }
);
