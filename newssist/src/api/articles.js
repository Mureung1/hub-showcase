import { supabase } from '../utils/supabaseClient';

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('no_session');
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function getArticles({ page = 1, limit = 20 } = {}) {
  const res = await fetch(`/api/articles?page=${page}&limit=${limit}`, {
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getReadHistory() {
  const res = await fetch('/api/articles/read', { headers: await authHeader() });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getArticle(id) {
  const res = await fetch(`/api/articles/${id}`, { headers: await authHeader() });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function markArticleRead(id) {
  const res = await fetch(`/api/articles/${id}/read`, {
    method: 'POST',
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getArticleSummary(id) {
  const res = await fetch(`/api/articles/${id}/summary`, {
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getArticleSimplified(id, level) {
  const res = await fetch(`/api/articles/${id}/simplify?level=${level}`, {
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
