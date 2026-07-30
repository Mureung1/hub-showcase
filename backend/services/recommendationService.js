import { recommendationRecipesSchema } from "../schemas/recommendations.js";
import { GeminiRecommendationError } from "./geminiRecommendations.js";
import {
  createRecommendationCacheKey,
  getRecommendationBatchNumber,
} from "./recommendationCache.js";
import {
  buildIngredientContext,
  createInventorySignature,
  getKstDateString,
  getNextKstMidnight,
  RecommendationPolicyError,
  validateGeneratedRecipes,
} from "./recommendationPolicy.js";

const INGREDIENT_FIELDS = [
  "name",
  "category",
  "subcategory",
  "tags",
  "quantity",
  "unit",
  "quantity_mode",
  "storage",
  "expiration_type",
  "expiration_date",
  "shelf_life_days",
  "stored_at",
  "is_staple",
  "is_instant",
  "is_prepared",
].join(",");

const noopLogger = {
  info() {},
  warn() {},
};

export class RecommendationServiceError extends Error {
  constructor(message, { code, status, cause } = {}) {
    super(message, { cause });
    this.name = "RecommendationServiceError";
    this.code = code;
    this.status = status;
  }
}

async function getCachedRecipes(cacheStore, cacheKey, logger) {
  try {
    const cached = await cacheStore.get(cacheKey);
    if (!cached) return null;
    return {
      ...cached,
      recipes: recommendationRecipesSchema.parse(cached.recipes),
    };
  } catch (error) {
    logger.warn({ err: error, code: "RECOMMENDATION_CACHE_READ_FAILED" }, "Recommendation cache read failed");
    return null;
  }
}

async function generateValidRecipes({ geminiClient, request, ingredientContext }) {
  let policyFeedback = [];
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await geminiClient.generate({ request, ingredientContext, policyFeedback });
      const recipes = validateGeneratedRecipes(result.generated, request, ingredientContext);
      if (recipes.length !== request.batchSize) {
        throw new RecommendationPolicyError([
          `RECIPE_COUNT_REQUIRED: 정확히 ${request.batchSize}개의 품질 검증된 레시피가 필요합니다.`,
        ]);
      }
      return {
        recipes,
        generationSummary: {
          requestedCount: 3,
          returnedCount: 3,
          stopReason: "targetMet",
        },
        metadata: result.metadata,
        attempt,
      };
    } catch (error) {
      lastError = error;
      const retryPolicyError = error instanceof RecommendationPolicyError && attempt < 3;
      const retryFormatError = error instanceof GeminiRecommendationError
        && error.code === "GEMINI_INVALID_RESPONSE"
        && attempt < 3;
      if (!retryPolicyError && !retryFormatError) throw error;
      policyFeedback = error.violations ?? [error.message];
    }
  }

  throw lastError;
}

export function createRecommendationService({ supabaseClient, geminiClient, cacheStore, now = () => new Date() }) {
  return {
    async recommend(request, { logger = noopLogger } = {}) {
      const currentTime = now();
      const { data: rows, error: ingredientError } = await supabaseClient
        .from("ingredients")
        .select(INGREDIENT_FIELDS);

      if (ingredientError) {
        throw new RecommendationServiceError("보유 재료를 불러오지 못했습니다.", {
          code: "INGREDIENTS_UNAVAILABLE",
          status: 503,
          cause: ingredientError,
        });
      }

      const ingredientContext = buildIngredientContext(rows ?? [], {
        today: getKstDateString(currentTime),
      });
      if (ingredientContext.availableIngredients.length === 0) {
        throw new RecommendationServiceError("추천에 사용할 수 있는 보유 재료가 없습니다.", {
          code: "NO_AVAILABLE_INGREDIENTS",
          status: 422,
        });
      }

      const inventorySignature = createInventorySignature(ingredientContext.availableIngredients);
      const cacheKey = createRecommendationCacheKey({ inventorySignature, request, now: currentTime });
      const cached = await getCachedRecipes(cacheStore, cacheKey, logger);
      if (cached) {
        logger.info({
          source: "cache",
          model: cached.model,
          recipeCount: cached.recipes.length,
          batchNumber: cached.batch_number,
        }, "Recipe recommendations served");
        return {
          recipes: cached.recipes,
          meta: {
            source: "cache",
            model: cached.model,
            batchNumber: cached.batch_number,
            maxBatches: 5,
            maxRecipes: 15,
            returnedCount: 3,
            stopReason: "targetMet",
            generatedAt: cached.generated_at,
            expiresAt: cached.expires_at,
          },
        };
      }

      const generated = await generateValidRecipes({ geminiClient, request, ingredientContext });
      const batchNumber = getRecommendationBatchNumber(request);
      const fallbackGeneratedAt = currentTime.toISOString();
      const fallbackExpiresAt = getNextKstMidnight(currentTime).toISOString();
      let savedCache = null;
      try {
        savedCache = await cacheStore.set({
          cacheKey,
          inventorySignature,
          request,
          recipes: generated.recipes,
          model: generated.metadata.model,
        });
      } catch (error) {
        logger.warn({ err: error, code: "RECOMMENDATION_CACHE_WRITE_FAILED" }, "Recommendation cache write failed");
      }

      logger.info({
        source: "gemini",
        model: generated.metadata.model,
        durationMs: generated.metadata.durationMs,
        recipeCount: generated.recipes.length,
        batchNumber,
        generationAttempt: generated.attempt,
      }, "Recipe recommendations served");

      return {
        recipes: generated.recipes,
        meta: {
          source: "gemini",
          model: generated.metadata.model,
          batchNumber,
          maxBatches: 5,
          maxRecipes: 15,
          returnedCount: generated.generationSummary.returnedCount,
          stopReason: generated.generationSummary.stopReason,
          generatedAt: savedCache?.generated_at ?? fallbackGeneratedAt,
          expiresAt: savedCache?.expires_at ?? fallbackExpiresAt,
        },
      };
    },
  };
}
