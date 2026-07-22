export function emptyHours() {
  return Array.from({ length: 24 }, () => 0);
}

function valueFor(item, name) {
  return item?.[name] ?? item?.[name.toUpperCase()];
}

function nonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function normalizeStopName(name) {
  return String(name ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/정류장$/u, '')
    .replace(/[\s()[\]{}.,·\-_/]/g, '');
}

export function aggregateMonthlyItems(items) {
  const boardings = emptyHours();
  const alightings = emptyHours();

  for (const item of items) {
    const mode = String(valueFor(item, 'trfc_mns_se_cd') ?? '').toUpperCase();
    if (mode && mode !== 'B') continue;

    const hour = Number.parseInt(String(valueFor(item, 'tzon') ?? ''), 10);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;
    boardings[hour] += nonNegativeNumber(valueFor(item, 'ride_nope'));
    alightings[hour] += nonNegativeNumber(valueFor(item, 'goff_nope'));
  }

  return {
    boardings,
    alightings,
    totals: boardings.map((value, hour) => value + alightings[hour]),
  };
}

export function percentile95(values) {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

export function scoreCampusUsage(stopTotals) {
  const reference = percentile95(Object.values(stopTotals).flat());
  const scores = Object.fromEntries(Object.entries(stopTotals).map(([stopId, totals]) => [
    stopId,
    totals.map((value) => reference > 0 ? Math.min(100, Math.round((value / reference) * 100)) : 0),
  ]));
  return { reference, scores };
}

export function scoreDirectionalUsage(stopTotals) {
  const flatTotals = {};
  for (const [stopId, directions] of Object.entries(stopTotals)) {
    for (const [direction, totals] of Object.entries(directions)) {
      flatTotals[`${stopId}:${direction}`] = totals;
    }
  }
  const { reference, scores: flatScores } = scoreCampusUsage(flatTotals);
  const scores = {};
  for (const key of Object.keys(flatScores)) {
    const separator = key.lastIndexOf(':');
    const stopId = key.slice(0, separator);
    const direction = key.slice(separator + 1);
    scores[stopId] ??= {};
    scores[stopId][direction] = flatScores[key];
  }
  return { reference, scores };
}

function bigrams(value) {
  if (value.length < 2) return new Set(value ? [value] : []);
  return new Set(Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2)));
}

export function stopNameSimilarity(left, right) {
  const a = bigrams(normalizeStopName(left));
  const b = bigrams(normalizeStopName(right));
  if (a.size === 0 && b.size === 0) return 1;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return (2 * overlap) / (a.size + b.size || 1);
}

export function findStopCandidates(appStopName, publicStops, limit = 5) {
  const normalized = normalizeStopName(appStopName);
  const exact = publicStops.filter((stop) => normalizeStopName(stop.sttn_nm) === normalized);
  const ranked = publicStops
    .map((stop) => ({ ...stop, similarity: stopNameSimilarity(appStopName, stop.sttn_nm) }))
    .sort((a, b) => b.similarity - a.similarity || String(a.sttn_nm).localeCompare(String(b.sttn_nm), 'ko'))
    .slice(0, limit);
  return { exact, ranked };
}

export function assertHourArray(value, name, { max = Number.POSITIVE_INFINITY } = {}) {
  if (!Array.isArray(value) || value.length !== 24) {
    throw new Error(`${name}은 24개 시간대 배열이어야 합니다.`);
  }
  value.forEach((entry, hour) => {
    if (!Number.isFinite(entry) || entry < 0 || entry > max) {
      throw new Error(`${name}[${hour}] 값이 범위를 벗어났습니다: ${entry}`);
    }
  });
}
