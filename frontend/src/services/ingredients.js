import { createApiUrl } from "../config/api";

const INGREDIENTS_API_URL = createApiUrl("/api/ingredients");

async function parseResponse(response, fallbackMessage) {
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error?.message ?? fallbackMessage);
  }

  return result;
}

export function convertIngredientFromApi(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory ?? null,
    tags: row.tags ?? [],
    quantity: row.quantity,
    unit: row.unit,
    quantityMode: row.quantity_mode,
    storage: row.storage,
    expirationType: row.expiration_type,
    expirationDate: row.expiration_date,
    shelfLifeDays: row.shelf_life_days,
    storedAt: row.stored_at,
    isStaple: row.is_staple,
    isInstant: row.is_instant,
    isPrepared: row.is_prepared,
    isLongTerm: row.expiration_type === "longTerm",
    icon: row.icon,
    memo: row.memo ?? "",
  };
}

function convertIngredientToApi(ingredient) {
  return {
    name: ingredient.name,
    category: ingredient.category,
    subcategory: ingredient.subcategory,
    tags: ingredient.tags,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    quantity_mode: ingredient.quantityMode,
    storage: ingredient.storage,
    expiration_type: ingredient.expirationType,
    expiration_date: ingredient.expirationDate,
    shelf_life_days: ingredient.shelfLifeDays,
    stored_at: ingredient.storedAt,
    is_staple: ingredient.isStaple,
    is_instant: ingredient.isInstant,
    is_prepared: ingredient.isPrepared,
    icon: ingredient.icon,
    memo: ingredient.memo,
  };
}

export async function getIngredients() {
  const response = await fetch(INGREDIENTS_API_URL);
  const result = await parseResponse(response, "재료를 불러오지 못했습니다.");
  return result.ingredients.map(convertIngredientFromApi);
}

export async function registerIngredient(ingredient) {
  const response = await fetch(INGREDIENTS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(convertIngredientToApi(ingredient)),
  });

  return parseResponse(response, "재료 등록에 실패했습니다. 다시 시도해 주세요.");
}

export async function updateIngredient(id, ingredient) {
  const response = await fetch(`${INGREDIENTS_API_URL}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(convertIngredientToApi(ingredient)),
  });

  return parseResponse(response, "재료 수정에 실패했습니다. 다시 시도해 주세요.");
}

export async function deleteIngredient(id) {
  const response = await fetch(`${INGREDIENTS_API_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await parseResponse(response, "재료 삭제에 실패했습니다. 다시 시도해 주세요.");
  }
}
