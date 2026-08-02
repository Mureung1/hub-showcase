export function matchesGroupBuyFilter(item, filter, savedIds = []) {
  if (filter === "open") return item.status === "open";
  if (filter === "mine") return item.userJoined === true;
  if (filter === "saved") return savedIds.includes(item.id);
  return true;
}

export function matchesGroupBuyCategory(item, category) {
  return category === "all" || item.category === category;
}

export const reconcileSavedIds = (savedIds, items) => {
  if (!Array.isArray(savedIds) || !Array.isArray(items)) return [];
  const existingIds = new Set(items.map((item) => item?.id));
  return [...new Set(savedIds)].filter((id) => existingIds.has(id));
};

export function getSavedStorageKey(userId) {
  return `campus-cart-saved:${userId || "guest"}`;
}
