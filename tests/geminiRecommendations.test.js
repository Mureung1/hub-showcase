import assert from "node:assert/strict";
import { test } from "vitest";

import {
  buildRecommendationPrompt,
  createGeminiRecommendationClient,
  GeminiRecommendationError,
} from "../backend/services/geminiRecommendations.js";
import {
  generatedRecommendationSchema,
  recommendationRequestSchema,
} from "../backend/schemas/recommendations.js";

const request = {
  mode: "quick",
  maxMissingIngredients: 0,
  batchSize: 3,
  batchNumber: 1,
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
    description: "고소한 삼겹살을 간단하게 즐기는 든든한 한 끼예요.",
    servings: 1,
    servingStyle: "singleDish",
    cookingTechnique: ["stirFry", "panFry", "stew"][index - 1],
    primaryIngredients: ["삼겹살"],
    components: [],
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
    substitutions: [{ ingredient: "삼겹살", alternatives: ["목살"], note: "기름을 조금 줄여 조리하세요." }],
    steps: ["재료를 손질해요.", "충분히 익혀요."],
    safetyNotes: ["고기를 충분히 익혀요."],
  };
}

test("프롬프트에 허용 재료만 포함하고 만료 재료는 포함하지 않는다", () => {
  const prompt = buildRecommendationPrompt({ request, ingredientContext });
  assert.match(prompt, /삼겹살/);
  assert.doesNotMatch(prompt, /상한 두부/);
  assert.match(prompt, /20분 안팎/);
  assert.match(prompt, /mealSet/);
  assert.match(prompt, /억지/);
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
        content: [{
          type: "text",
          text: JSON.stringify({
            recipes: [1, 2, 3].map(generatedRecipe),
            generationSummary: {
              requestedCount: 3,
              returnedCount: 3,
              stopReason: "targetMet",
            },
          }),
        }],
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
  assert.ok(requestBody.response_format.schema.properties.recipes.items.required.includes("description"));
  assert.ok(requestBody.response_format.schema.properties.recipes.items.required.includes("substitutions"));
  assert.ok(requestBody.response_format.schema.properties.recipes.items.required.includes("servingStyle"));
  assert.ok(requestBody.response_format.schema.required.includes("generationSummary"));
});

test("대체 재료 안내가 없는 응답은 형식 오류로 거부한다", async () => {
  const invalidRecipe = generatedRecipe(1);
  delete invalidRecipe.substitutions;
  const fetchImpl = async () => new Response(JSON.stringify({
    id: "interaction-missing-substitutions",
    model: "test-model",
    steps: [{
      type: "model_output",
      content: [{
        type: "text",
        text: JSON.stringify({
          recipes: [invalidRecipe, generatedRecipe(2), generatedRecipe(3)],
          generationSummary: {
            requestedCount: 3,
            returnedCount: 3,
            stopReason: "targetMet",
          },
        }),
      }],
    }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  const client = createGeminiRecommendationClient({ apiKey: "test-key", model: "test-model", fetchImpl });

  await assert.rejects(
    () => client.generate({ request, ingredientContext }),
    (error) => error instanceof GeminiRecommendationError && error.code === "GEMINI_INVALID_RESPONSE",
  );
});

test("품질 기준을 통과한 레시피가 적으면 1~2개 응답을 허용한다", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    id: "interaction-quality-limit",
    model: "test-model",
    steps: [{
      type: "model_output",
      content: [{
        type: "text",
        text: JSON.stringify({
          recipes: [generatedRecipe(1)],
          generationSummary: {
            requestedCount: 3,
            returnedCount: 1,
            stopReason: "qualityLimit",
          },
        }),
      }],
    }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  const client = createGeminiRecommendationClient({ apiKey: "test-key", model: "test-model", fetchImpl });

  const result = await client.generate({ request, ingredientContext });
  assert.equal(result.generated.recipes.length, 1);
  assert.equal(result.generated.generationSummary.stopReason, "qualityLimit");
});

test("추천 요청은 부족 재료를 최대 두 개까지 허용하고 세 개는 거부한다", () => {
  assert.equal(recommendationRequestSchema.parse({ maxMissingIngredients: 2 }).maxMissingIngredients, 2);
  assert.throws(() => recommendationRequestSchema.parse({ maxMissingIngredients: 3 }));
});

test("적합한 레시피가 없으면 빈 결과와 명시적인 종료 이유를 허용한다", () => {
  const result = generatedRecommendationSchema.parse({
    recipes: [],
    generationSummary: {
      requestedCount: 3,
      returnedCount: 0,
      stopReason: "noSuitableRecipe",
    },
  });
  assert.equal(result.recipes.length, 0);
});

test("실제 반환 개수와 요약 개수가 다르면 형식 오류로 거부한다", () => {
  assert.throws(() => generatedRecommendationSchema.parse({
    recipes: [generatedRecipe(1)],
    generationSummary: {
      requestedCount: 3,
      returnedCount: 2,
      stopReason: "qualityLimit",
    },
  }));
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

test("인증 실패를 재시도할 수 없는 서비스 오류로 변환한다", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ error: { message: "unauthorized" } }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
  const client = createGeminiRecommendationClient({ apiKey: "test-key", model: "test-model", fetchImpl });

  await assert.rejects(
    () => client.generate({ request, ingredientContext }),
    (error) => error instanceof GeminiRecommendationError
      && error.code === "GEMINI_AUTH_ERROR"
      && error.status === 503
      && error.retryable === false,
  );
});

test("요청 시간 초과를 재시도 가능한 서비스 오류로 변환한다", async () => {
  const fetchImpl = async () => {
    const error = new Error("timeout");
    error.name = "TimeoutError";
    throw error;
  };
  const client = createGeminiRecommendationClient({ apiKey: "test-key", model: "test-model", fetchImpl });

  await assert.rejects(
    () => client.generate({ request, ingredientContext }),
    (error) => error instanceof GeminiRecommendationError
      && error.code === "GEMINI_TIMEOUT"
      && error.status === 503
      && error.retryable === true,
  );
});

test("잘못된 JSON 응답을 재시도 가능한 형식 오류로 변환한다", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    id: "interaction-invalid-json",
    model: "test-model",
    steps: [{
      type: "model_output",
      content: [{ type: "text", text: "not-json" }],
    }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  const client = createGeminiRecommendationClient({ apiKey: "test-key", model: "test-model", fetchImpl });

  await assert.rejects(
    () => client.generate({ request, ingredientContext }),
    (error) => error instanceof GeminiRecommendationError
      && error.code === "GEMINI_INVALID_RESPONSE"
      && error.status === 502
      && error.retryable === true,
  );
});
