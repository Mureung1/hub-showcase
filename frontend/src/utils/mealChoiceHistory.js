export const MEAL_CHOICE_HISTORY_KEY = "todaysFridge:meal-choice-history:v1";

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 30;
const COACHING_WINDOW_DAYS = 7;

function isValidEvent(event) {
  return event
    && typeof event.recipeId === "string"
    && !Number.isNaN(Date.parse(event.selectedAt))
    && typeof event.isInstant === "boolean";
}

export function pruneMealChoiceHistory(events, now = new Date()) {
  const retentionStart = now.getTime() - RETENTION_DAYS * DAY_MS;
  return Array.isArray(events)
    ? events.filter((event) => isValidEvent(event) && Date.parse(event.selectedAt) >= retentionStart)
    : [];
}

export function readMealChoiceHistory(storage = globalThis.localStorage, now = new Date()) {
  if (!storage) return [];
  try {
    return pruneMealChoiceHistory(JSON.parse(storage.getItem(MEAL_CHOICE_HISTORY_KEY) ?? "[]"), now);
  } catch {
    return [];
  }
}

export function recordMealChoice(event, storage = globalThis.localStorage, now = new Date()) {
  if (!storage || !isValidEvent(event)) return [];
  const nextHistory = pruneMealChoiceHistory([...readMealChoiceHistory(storage, now), event], now);
  storage.setItem(MEAL_CHOICE_HISTORY_KEY, JSON.stringify(nextHistory));
  return nextHistory;
}

export function getInstantChoiceCount(events, now = new Date()) {
  const windowStart = now.getTime() - COACHING_WINDOW_DAYS * DAY_MS;
  return pruneMealChoiceHistory(events, now)
    .filter((event) => event.isInstant && Date.parse(event.selectedAt) >= windowStart)
    .length;
}

export function getCoachingTone(events, { now = new Date(), includeCurrentChoice = false } = {}) {
  const count = getInstantChoiceCount(events, now) + (includeCurrentChoice ? 1 : 0);
  if (count >= 3) return "direct";
  if (count >= 2) return "playful";
  return "gentle";
}
