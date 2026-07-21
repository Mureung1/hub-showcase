const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

export function addDaysToDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayDateString() {
  return formatLocalDate(new Date());
}

export function getIngredientDueDate(ingredient) {
  if (!ingredient || ingredient.expirationType === "longTerm" || ingredient.expirationType === "notTracked") return null;
  if (ingredient.expirationType === "exact") return ingredient.expirationDate;
  if (ingredient.recommendedUseBy) return ingredient.recommendedUseBy;
  if (ingredient.storedAt && Number.isFinite(ingredient.shelfLifeDays)) return addDaysToDate(ingredient.storedAt, ingredient.shelfLifeDays);
  return ingredient.expirationDate ?? null;
}

export function getDaysRemaining(expirationDate, referenceDate = new Date()) {
  if (!expirationDate) return null;

  const today = new Date(referenceDate);
  const target = new Date(`${expirationDate}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / MS_PER_DAY);
}

export function getExpirationStatus(daysRemaining) {
  if (daysRemaining === null) return "neutral";
  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 2) return "urgent";
  if (daysRemaining <= 5) return "soon";
  return "fresh";
}

export function getExpirationLabel(daysRemaining) {
  if (daysRemaining === null) return "소비기한 정보 없음";
  if (daysRemaining < 0) return "소비기한 지남";
  if (daysRemaining === 0) return "오늘까지";
  if (daysRemaining === 1) return "내일까지";
  return `${daysRemaining}일 남음`;
}

export function getExpirationSentence(daysRemaining) {
  if (daysRemaining === null) return "소비기한 정보가 없어요.";
  if (daysRemaining < 0) return "소비기한이 지났어요.";
  if (daysRemaining === 0) return "오늘까지 사용해야 해요.";
  if (daysRemaining === 1) return "내일까지 사용해 주세요.";
  return `소비기한이 ${daysRemaining}일 남았어요.`;
}

export function formatDday(daysRemaining) {
  if (daysRemaining === null) return "기한 없음";
  if (daysRemaining < 0) return `D+${Math.abs(daysRemaining)}`;
  if (daysRemaining === 0) return "D-Day";
  return `D-${daysRemaining}`;
}

export function isUrgentIngredient(daysRemaining) {
  return daysRemaining !== null && daysRemaining <= 2;
}
