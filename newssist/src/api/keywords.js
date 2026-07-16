export async function getKeywords() {
  const res = await fetch('/api/keywords');
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
