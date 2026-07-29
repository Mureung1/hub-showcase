import { createHash } from "node:crypto";

import { getKstDateString, getNextKstMidnight } from "./recommendationPolicy.js";

const CACHE_TABLE = "recipe_recommendation_cache";
const RECOMMENDATION_POLICY_VERSION = "processing-balance-v1";

function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right, "ko"));
}

export function createRecommendationCacheKey({ inventorySignature, request, now = new Date() }) {
  const keySource = {
    policyVersion: RECOMMENDATION_POLICY_VERSION,
    kstDate: getKstDateString(now),
    inventorySignature,
    mode: request.mode,
    maxMissingIngredients: request.maxMissingIngredients,
    batchSize: request.batchSize,
    batchNumber: request.batchNumber,
    excludedRecipeFingerprints: sortStrings(request.excludedRecipeFingerprints),
    allergens: sortStrings(request.allergens),
    excludedIngredients: sortStrings(request.excludedIngredients),
    dietaryPreferences: sortStrings(request.dietaryPreferences),
  };
  return createHash("sha256").update(JSON.stringify(keySource)).digest("hex");
}

export function getRecommendationBatchNumber(request) {
  return request.batchNumber;
}

export function createRecommendationCacheStore({ supabaseClient, now = () => new Date() }) {
  return {
    async get(cacheKey) {
      const currentTime = now().toISOString();
      const { data, error } = await supabaseClient
        .from(CACHE_TABLE)
        .select("cache_key, recipes, model, batch_number, generated_at, expires_at")
        .eq("cache_key", cacheKey)
        .gt("expires_at", currentTime)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async set({ cacheKey, inventorySignature, request, recipes, model }) {
      const currentTime = now();
      const row = {
        cache_key: cacheKey,
        inventory_signature: inventorySignature,
        request_options: request,
        recipes,
        model,
        batch_number: getRecommendationBatchNumber(request),
        generated_at: currentTime.toISOString(),
        expires_at: getNextKstMidnight(currentTime).toISOString(),
        updated_at: currentTime.toISOString(),
      };
      const { data, error } = await supabaseClient
        .from(CACHE_TABLE)
        .upsert(row, { onConflict: "cache_key" })
        .select("cache_key, recipes, model, batch_number, generated_at, expires_at")
        .single();

      if (error) throw error;
      return data;
    },
  };
}
