import 'server-only';
import { redirect } from 'next/navigation';
import { getServerSupabaseClient } from '../lib/supabase/server';
import type { AdapterContext } from '../adapters/core/types';
export interface SessionDto { readonly userId: string; readonly email: string | null }
export async function getSession(): Promise<SessionDto | null> {
  const client = await getServerSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user ? { userId: data.user.id, email: data.user.email ?? null } : null;
}
export async function requireSession(returnTo = '/dashboard'): Promise<AdapterContext> {
  const session = await getSession();
  if (!session) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  return { sessionUserId: session.userId, requestId: crypto.randomUUID(), now: new Date() };
}
