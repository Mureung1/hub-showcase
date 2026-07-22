import { Router } from "express";

import { env } from "../config/env.js";
import { supabase } from "../lib/supabase.js";
import { recommendationRequestSchema } from "../schemas/recommendations.js";
import { createGeminiRecommendationClient } from "../services/geminiRecommendations.js";
import { createRecommendationCacheStore } from "../services/recommendationCache.js";
import { createRecommendationService } from "../services/recommendationService.js";

export function createRecommendationsRouter({ recommendationService }) {
  const router = Router();

  router.post("/", async (request, response, next) => {
    try {
      const parsed = recommendationRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return response.status(400).json({
          error: {
            code: "INVALID_RECOMMENDATION_REQUEST",
            message: "추천 조건을 확인해 주세요.",
            fields: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const result = await recommendationService.recommend(parsed.data, { logger: request.log });
      return response.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

const geminiClient = createGeminiRecommendationClient({
  apiKey: env.GEMINI_API_KEY,
  model: env.GEMINI_MODEL,
});
const cacheStore = createRecommendationCacheStore({ supabaseClient: supabase });
const recommendationService = createRecommendationService({
  supabaseClient: supabase,
  geminiClient,
  cacheStore,
});

export const recommendationsRouter = createRecommendationsRouter({ recommendationService });
