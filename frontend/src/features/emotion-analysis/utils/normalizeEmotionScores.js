export function normalizeEmotionScores(rawScores) {
  const entries = Object.entries(rawScores || {}).map(([key, value], index) => ({
    key,
    index,
    value: Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0
  }));

  if (entries.length === 0) return [];

  const total = entries.reduce((sum, item) => sum + item.value, 0);
  const exactScores = entries.map((item) => ({
    ...item,
    exact: total > 0 ? (item.value / total) * 100 : 100 / entries.length
  }));
  const flooredTotal = exactScores.reduce((sum, item) => sum + Math.floor(item.exact), 0);
  const remainder = 100 - flooredTotal;
  const remainderOrder = [...exactScores].sort((a, b) => {
    const fractionDifference = (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact));
    return fractionDifference || a.index - b.index;
  });
  const incrementedKeys = new Set(remainderOrder.slice(0, remainder).map((item) => item.key));

  return exactScores
    .map((item) => ({
      key: item.key,
      score: Math.floor(item.exact) + (incrementedKeys.has(item.key) ? 1 : 0),
      index: item.index
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ key, score }) => ({ key, score }));
}
