import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from './lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;

  const publicAuthRoutes = [
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/logout',
    '/api/auth/username-available',
    '/api/auth/recover/verify',
    '/api/auth/recover/reset',
  ];
  const isPublicRoute =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === '/forgot-password' ||
    publicAuthRoutes.includes(request.nextUrl.pathname) ||
    request.nextUrl.pathname.startsWith('/join/');

  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!token) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  const payload = await verifyJwt(token);
  if (!payload) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-email', payload.email);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
