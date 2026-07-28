import { supabase } from '../utils/supabaseClient';

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('no_session');
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function getWeeklyReport() {
  const res = await fetch('/api/reports/weekly', { headers: await authHeader() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function generateWeeklyReport() {
  const res = await fetch('/api/reports/weekly/generate', {
    method: 'POST',
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
