import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/search',
  '/experts',
  '/auth',
  '/_next',
  '/api',
  '/favicon.ico',
  '/manifest.json',
];

const AUTH_REQUIRED_PREFIXES = [
  '/dashboard',
  '/requests',
  '/notifications',
  '/refunds',
  '/settings',
  '/expert',
  '/admin',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow static resources
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // In development, allow everything
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Check auth for protected routes
  const isProtected = AUTH_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected) {
    const token = request.cookies.get('sb-access-token')?.value;
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
