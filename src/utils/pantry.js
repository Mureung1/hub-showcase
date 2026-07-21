export const PANTRY_STORAGE_KEY = "todaysFridge:pantry:v1";

export const PANTRY_ITEMS = [
  { id: "salt", name: "소금", aliases: ["소금"] },
  { id: "pepper", name: "후추", aliases: ["후추"] },
  { id: "oil", name: "식용유", aliases: ["식용유", "올리브유", "참기름", "들기름"] },
  { id: "chiliPowder", name: "고춧가루", aliases: ["고춧가루"] },
  { id: "soySauce", name: "간장", aliases: ["간장", "진간장", "국간장"] },
  { id: "sugar", name: "설탕", aliases: ["설탕"] },
  { id: "vinegar", name: "식초", aliases: ["식초"] },
  { id: "mincedGarlic", name: "다진 마늘", aliases: ["다진마늘", "다진 마늘"] },
];

export function normalizePantryName(name) {
  return String(name ?? "").trim().replaceAll(" ", "").toLowerCase();
}

export function getPantryItemByName(name) {
  const normalizedName = normalizePantryName(name);
  return PANTRY_ITEMS.find((item) => item.aliases.some((alias) => normalizePantryName(alias) === normalizedName)) ?? null;
}

export function isPantryIngredientName(name) {
  return Boolean(getPantryItemByName(name));
}

export function getDefaultPantryAvailability() {
  return Object.fromEntries(PANTRY_ITEMS.map(({ id }) => [id, true]));
}

export function readPantryAvailability(storage = globalThis.localStorage) {
  const defaults = getDefaultPantryAvailability();
  if (!storage) return defaults;

  try {
    const parsed = JSON.parse(storage.getItem(PANTRY_STORAGE_KEY));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return defaults;
    return Object.fromEntries(PANTRY_ITEMS.map(({ id }) => [id, typeof parsed[id] === "boolean" ? parsed[id] : true]));
  } catch {
    return defaults;
  }
}

export function writePantryAvailability(availability, storage = globalThis.localStorage) {
  const sanitized = Object.fromEntries(PANTRY_ITEMS.map(({ id }) => [id, availability[id] !== false]));
  storage?.setItem(PANTRY_STORAGE_KEY, JSON.stringify(sanitized));
  return sanitized;
}

export function getRecipePantryItems(recipe) {
  const ingredientNames = [...(recipe.requiredIngredients ?? []), ...(recipe.optionalIngredients ?? [])];
  const items = ingredientNames.map(getPantryItemByName).filter(Boolean);
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
