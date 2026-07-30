export const DEFAULT_ALL_NOTICES_PER_SOURCE = 10;
export const MIN_ALL_NOTICES_PER_SOURCE = 1;
export const MAX_ALL_NOTICES_PER_SOURCE = 50;

export function normalizeAllNoticesPerSource(value) {
  if (typeof value === "string" && !value.trim()) {
    return DEFAULT_ALL_NOTICES_PER_SOURCE;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return DEFAULT_ALL_NOTICES_PER_SOURCE;
  }

  return Math.min(
    MAX_ALL_NOTICES_PER_SOURCE,
    Math.max(MIN_ALL_NOTICES_PER_SOURCE, Math.round(numericValue)),
  );
}

function publishedTime(link) {
  const value = String(link?.publishedAt ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) ? time : null;
}

function sourcePosition(link) {
  return Number.isInteger(link?.index) && link.index >= 0
    ? link.index
    : Number.MAX_SAFE_INTEGER;
}

export function sortNoticeLinksByPublishedOrder(links) {
  return [...links]
    .map((link, inputOrder) => ({ inputOrder, link }))
    .sort((left, right) => {
      const leftTime = publishedTime(left.link);
      const rightTime = publishedTime(right.link);

      if (leftTime !== null || rightTime !== null) {
        if (leftTime === null) return 1;
        if (rightTime === null) return -1;
        if (leftTime !== rightTime) return rightTime - leftTime;
      }

      const positionDifference = sourcePosition(left.link) - sourcePosition(right.link);
      return positionDifference || left.inputOrder - right.inputOrder;
    })
    .map(({ link }) => link);
}

export function mergeSourceNoticeLinks(sourceResults, key, { perSourceLimit = null } = {}) {
  const links = sourceResults.flatMap((result) => {
    const sourceLinks = Array.isArray(result?.[key]) ? result[key] : [];
    const orderedSourceLinks = sortNoticeLinksByPublishedOrder(sourceLinks);

    return perSourceLimit === null
      ? orderedSourceLinks
      : orderedSourceLinks.slice(0, perSourceLimit);
  });

  return sortNoticeLinksByPublishedOrder(links);
}
