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
