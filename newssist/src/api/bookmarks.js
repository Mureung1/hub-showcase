import { supabase } from '../utils/supabaseClient';

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('no_session');
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function getBookmarks() {
  const res = await fetch('/api/bookmarks', { headers: await authHeader() });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function addBookmark(articleId) {
  const res = await fetch('/api/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ articleId }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function removeBookmark(articleId) {
  const res = await fetch(`/api/bookmarks/${articleId}`, {
    method: 'DELETE',
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
