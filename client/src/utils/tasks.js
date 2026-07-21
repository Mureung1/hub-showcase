export function calcStats(list) {
  const total = list.length;
  const doneCount = list.filter((t) => t.status === 'done').length;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  return { total, doneCount, percent };
}
