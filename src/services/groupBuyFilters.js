export function matchesGroupBuyFilter(item, filter, savedIds = []) {
  if (filter === "open") return item.status === "open";
  if (filter === "mine") return item.userJoined === true;
  if (filter === "saved") return savedIds.includes(item.id);
  return true;
}

export function matchesGroupBuyCategory(item, category) {
  return category === "all" || item.category === category;
}
