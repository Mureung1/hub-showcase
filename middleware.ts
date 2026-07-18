import { NextResponse, type NextRequest } from 'next/server';
import { refreshSession } from './src/web/lib/supabase/middleware-client';
const protectedPaths = ['/dashboard', '/challenges/new', '/official-challenge/payment/return', '/study', '/wallet', '/profile'];
export async function middleware(request: NextRequest) {
  const { response, authenticated } = await refreshSession(request);
  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`));
  if (isProtected && !authenticated) { const url = request.nextUrl.clone(); url.pathname = '/login'; url.search = `?returnTo=${encodeURIComponent(`${request.nextUrl.pathname}${request.nextUrl.search}`)}`; return NextResponse.redirect(url); }
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api/payments|api/cron).*)'] };
