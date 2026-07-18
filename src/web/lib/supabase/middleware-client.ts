import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getClientEnv } from '../../config/client-env';
export async function refreshSession(request: NextRequest): Promise<{ response: NextResponse; authenticated: boolean }> {
  let response = NextResponse.next({ request });
  const env = getClientEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey) return { response, authenticated: false };
  const client = createServerClient(env.supabaseUrl, env.supabaseAnonKey, { cookies: { getAll: () => request.cookies.getAll(), setAll: (values) => { values.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  const { data } = await client.auth.getUser();
  return { response, authenticated: Boolean(data.user) };
}
