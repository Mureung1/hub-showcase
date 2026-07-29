const MAX_RECOMMENDATIONS = 3;

function normalize(value) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function progress(item) {
  const current = Number.isFinite(item.currentPeople) ? item.currentPeople : 0;
  const target = Number.isFinite(item.targetPeople) && item.targetPeople > 0
    ? item.targetPeople
    : 0;
  return target === 0 ? 0 : current / target;
}

function compareRanked(left, right) {
  return right.score - left.score
    || progress(right.item) - progress(left.item)
    || normalize(left.item.name).localeCompare(normalize(right.item.name), "ko")
    || String(left.item.id ?? "").localeCompare(String(right.item.id ?? ""));
}

function recommendationScore(item, query, queryTokens, exactCategories) {
  const name = normalize(item.name);
  const category = normalize(item.category);
  const nameTokens = new Set(name.split(" ").filter(Boolean));
  const tokenMatches = queryTokens.filter((token) => nameTokens.has(token)).length;

  let score = tokenMatches * 10;
  if (name.includes(query)) score += 20;
  if (category === query || queryTokens.includes(category)) score += 6;
  if (category && exactCategories.has(category)) score += 5;
  return score;
}

export function getGroupBuySearchResults(items, query) {
  const normalizedQuery = normalize(query);
  if (!Array.isArray(items) || normalizedQuery === "") {
    return { exact: [], recommendations: [] };
  }

  const validItems = items.filter(
    (item) => item !== null && typeof item === "object" && normalize(item.name) !== "",
  );
  const exact = validItems.filter((item) => normalize(item.name).includes(normalizedQuery));
  const exactIds = new Set(exact.map((item) => item.id).filter((id) => id !== undefined));
  const exactCategories = new Set(exact.map((item) => normalize(item.category)).filter(Boolean));
  const queryTokens = normalizedQuery.split(" ");
  const seenIds = new Set();
  const seenNames = new Set();

  const recommendations = validItems
    .filter((item) => {
      if (item.status !== "open" || exact.includes(item)) return false;
      const name = normalize(item.name);
      if (exactIds.has(item.id) || seenIds.has(item.id) || seenNames.has(name)) return false;
      if (item.id !== undefined) seenIds.add(item.id);
      seenNames.add(name);
      return true;
    })
    .map((item) => ({
      item,
      score: recommendationScore(item, normalizedQuery, queryTokens, exactCategories),
    }))
    .filter(({ score }) => score > 0)
    .sort(compareRanked)
    .slice(0, MAX_RECOMMENDATIONS)
    .map(({ item }) => item);

  return { exact, recommendations };
}
