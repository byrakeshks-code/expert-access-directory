import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api', '/_next', '/favicon.ico'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // In development, allow access if dev bypass is enabled
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    return NextResponse.next();
  }

  // In production, check for auth token
  const token =
    request.cookies.get('admin_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
