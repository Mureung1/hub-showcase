export function calculateDDay(deadlineStr) {
  if (!deadlineStr || typeof deadlineStr !== "string") return null;

  const [year, month, day] = deadlineStr.split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const today = new Date();
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const deadlineUTC = Date.UTC(year, month - 1, day);

  const diffMs = deadlineUTC - todayUTC;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays >= 0 ? diffDays : null;
}

export function formatDDay(diffDays) {
  if (diffDays === null) return null;
  if (diffDays === 0) return "D-Day";
  return `D-${diffDays}`;
}

export function isValidDeadline(deadlineStr) {
  return calculateDDay(deadlineStr) !== null;
}
