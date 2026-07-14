export function matchesSearch(bakery, query) {
  const q = query.trim();
  if (!q) return true;
  return bakery.name.includes(q) || bakery.menu.includes(q);
}
