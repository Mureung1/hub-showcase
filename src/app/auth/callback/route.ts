import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabaseClient } from '../../../web/lib/supabase/server';
import { safeReturnTo } from '../../../web/auth/return-to';
export async function GET(request: NextRequest) { const url = new URL(request.url); const code = url.searchParams.get('code'); const returnTo = safeReturnTo(url.searchParams.get('returnTo')); const client = await getServerSupabaseClient(); if (code && client) { const { error } = await client.auth.exchangeCodeForSession(code); if (!error) return NextResponse.redirect(new URL(returnTo, url.origin)); } return NextResponse.redirect(new URL('/login?error=callback', url.origin)); }
