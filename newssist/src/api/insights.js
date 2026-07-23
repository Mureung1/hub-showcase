import { supabase } from '../utils/supabaseClient';

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('no_session');
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function getClusters() {
  const res = await fetch('/api/insights/clusters', { headers: await authHeader() });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getCluster(id) {
  const res = await fetch(`/api/insights/clusters/${id}`, { headers: await authHeader() });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
