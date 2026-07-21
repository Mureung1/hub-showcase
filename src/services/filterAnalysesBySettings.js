export function filterAnalysesBySettings(items = [], settings = null) {
  if (!settings) return items;

  return items.filter((item) => {
    const opportunity = item?.opportunity ?? {};
    const match = item?.match ?? {};
    const category = opportunity.category;

    if (settings.recommendationCategories?.length && !settings.recommendationCategories.includes(category)) {
      return false;
    }
    if (!settings.includeUnknownDeadline && !opportunity.deadline) {
      return false;
    }
    if (typeof match.score === "number" && match.score < settings.minimumMatchScore) {
      return false;
    }

    return true;
  });
}