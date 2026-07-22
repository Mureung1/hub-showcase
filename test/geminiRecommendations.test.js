import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRecommendationPrompt,
  createGeminiRecommendationClient,
  GeminiRecommendationError,
} from "../server/services/geminiRecommendations.js";

const request = {
  mode: "quick",
  maxMissingIngredients: 0,
  batchSize: 3,
  excludedRecipeFingerprints: [],
  allergens: [],
  excludedIngredients: [],
  dietaryPreferences: [],
};

const ingredientContext = {
  availableIngredients: [{ name: "삼겹살", tags: ["nutrition:protein"], priorityScore: 55 }],
  excludedExpiredIngredients: [{ name: "상한 두부" }],
  nutritionProfile: { "nutrition:protein": 1 },
};

function generatedRecipe(index) {
  return {
    name: `삼겹살 메뉴 ${index}`,
    servings: 1,
    requiredIngredients: [{ name: "삼겹살", amount: 200, unit: "g" }],
    optionalIngredients: [],
    cookingTime: 15,
    difficulty: "easy",
    cookingMethod: "fire",
    dishType: ["stirFry", "riceBowl", "stew"][index - 1],
    effortLevel: "low",
    recommendationReasons: ["보유 재료 활용"],
    nutritionTags: ["nutrition:protein"],
    nutritionSummary: "단백질 중심 메뉴",
    steps: ["재료를 손질해요.", "충분히 익혀요."],
    safetyNotes: ["고기를 충분히 익혀요."],
  };
}

test("프롬프트에 허용 재료만 포함하고 만료 재료는 포함하지 않는다", () => {
  const prompt = buildRecommendationPrompt({ request, ingredientContext });
  assert.match(prompt, /삼겹살/);
  assert.doesNotMatch(prompt, /상한 두부/);
  assert.match(prompt, /20분 이내/);
});

test("Interactions API 구조화 응답을 Zod로 검증한다", async () => {
  let requestBody;
  const fetchImpl = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      id: "interaction-1",
      model: "gemini-3.1-flash-lite",
      usage: { total_input_tokens: 10, total_output_tokens: 20 },
      steps: [{
        type: "model_output",
        content: [{ type: "text", text: JSON.stringify({ recipes: [1, 2, 3].map(generatedRecipe) }) }],
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const client = createGeminiRecommendationClient({ apiKey: "test-key", model: "test-model", fetchImpl });
  const result = await client.generate({ request, ingredientContext });

  assert.equal(result.generated.recipes.length, 3);
  assert.equal(result.metadata.inputTokens, 10);
  assert.equal(requestBody.response_format.mime_type, "application/json");
  assert.ok(requestBody.response_format.schema.required.includes("recipes"));
  assert.ok(requestBody.response_format.schema.properties.recipes.items.required.includes("dishType"));
});

test("무료 사용 한도 오류를 재시도 가능한 서비스 오류로 변환한다", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ error: { message: "quota" } }), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });
  const client = createGeminiRecommendationClient({ apiKey: "test-key", model: "test-model", fetchImpl });

  await assert.rejects(
    () => client.generate({ request, ingredientContext }),
    (error) => error instanceof GeminiRecommendationError
      && error.code === "GEMINI_RATE_LIMITED"
      && error.retryable === true,
  );
});
