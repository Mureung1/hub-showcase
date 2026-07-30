import { supabase } from '../utils/supabaseClient';

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('no_session');
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function getProfile() {
  const res = await fetch('/api/profile', { headers: await authHeader() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function createProfile({ keywordIds }) {
  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ keywordIds }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
