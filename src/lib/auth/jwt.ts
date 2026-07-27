import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-key'
);

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  [key: string]: string;
}

export async function signJwt(payload: JwtPayload, expiresIn = '7d'): Promise<string> {
  const token = await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);

  return token;
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as JwtPayload;
  } catch {
    return null;
  }
}
