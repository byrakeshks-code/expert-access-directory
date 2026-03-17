import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  // Auth is handled client-side by the AuthProvider.
  // Supabase JS stores sessions in localStorage (not cookies),
  // so server-side middleware cannot reliably check auth state.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
