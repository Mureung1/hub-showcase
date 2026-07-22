import { z } from "zod";

export const RECOMMENDATION_MODES = ["noFire", "quick", "balanced"];
export const DISH_TYPES = ["stirFry", "riceBowl", "soup", "stew", "noodle", "salad", "sandwich", "other"];
export const NUTRITION_TAGS = [
  "nutrition:carb",
  "nutrition:protein",
  "nutrition:vegetable",
  "nutrition:fat",
];

const futurePreferenceSchema = z.array(z.string().trim().min(1).max(100)).max(20).default([]);

export const recommendationRequestSchema = z.object({
  mode: z.enum(RECOMMENDATION_MODES).default("quick"),
  maxMissingIngredients: z.union([z.literal(0), z.literal(1)]).default(0),
  batchSize: z.literal(3).default(3),
  excludedRecipeFingerprints: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(12).default([]),
  allergens: futurePreferenceSchema,
  excludedIngredients: futurePreferenceSchema,
  dietaryPreferences: futurePreferenceSchema,
}).strict().superRefine((request, context) => {
  if (request.excludedRecipeFingerprints.length % request.batchSize !== 0) {
    context.addIssue({
      code: "custom",
      path: ["excludedRecipeFingerprints"],
      message: "제외할 레시피 fingerprint는 이전 추천 묶음 단위로 전달해야 합니다.",
    });
  }
});

export const generatedIngredientSchema = z.object({
  name: z.string().trim().min(1).max(100),
  amount: z.number().positive().max(100_000),
  unit: z.string().trim().min(1).max(30),
}).strict();

export const generatedRecipeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  servings: z.literal(1),
  requiredIngredients: z.array(generatedIngredientSchema).min(1).max(15),
  optionalIngredients: z.array(generatedIngredientSchema).max(10),
  cookingTime: z.number().int().min(1).max(120),
  difficulty: z.enum(["easy", "normal"]),
  cookingMethod: z.enum(["noFire", "fire"]),
  dishType: z.enum(DISH_TYPES),
  effortLevel: z.enum(["low", "medium"]),
  recommendationReasons: z.array(z.string().trim().min(1).max(200)).min(1).max(3),
  nutritionTags: z.array(z.enum(NUTRITION_TAGS)).max(NUTRITION_TAGS.length),
  nutritionSummary: z.string().trim().min(1).max(300),
  steps: z.array(z.string().trim().min(1).max(300)).min(2).max(10),
  safetyNotes: z.array(z.string().trim().min(1).max(300)).max(3),
}).strict();

export const generatedRecommendationSchema = z.object({
  recipes: z.array(generatedRecipeSchema).length(3),
}).strict();

export const recommendationRecipeSchema = generatedRecipeSchema.extend({
  id: z.string().startsWith("recipe-"),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  missingIngredients: z.array(z.string().trim().min(1).max(100)).max(1),
}).strict();

export const recommendationRecipesSchema = z.array(recommendationRecipeSchema).length(3);

const stringSchema = (description) => ({
  type: "string",
  description,
});

const ingredientJsonSchema = {
  type: "object",
  properties: {
    name: stringSchema("재료 이름"),
    amount: { type: "number", description: "1인분에 사용하는 양" },
    unit: stringSchema("g, ml, 개, 대, 큰술 같은 사용량 단위"),
  },
  required: ["name", "amount", "unit"],
};

export const geminiRecommendationJsonSchema = {
  type: "object",
  properties: {
    recipes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: stringSchema("한국어 레시피명"),
          servings: { type: "integer", description: "항상 1인분" },
          requiredIngredients: { type: "array", items: ingredientJsonSchema },
          optionalIngredients: { type: "array", items: ingredientJsonSchema },
          cookingTime: { type: "integer", description: "분 단위 조리 시간" },
          difficulty: { type: "string", enum: ["easy", "normal"] },
          cookingMethod: { type: "string", enum: ["noFire", "fire"] },
          dishType: { type: "string", enum: DISH_TYPES },
          effortLevel: { type: "string", enum: ["low", "medium"] },
          recommendationReasons: {
            type: "array",
            items: stringSchema("이 레시피를 추천한 구체적인 이유"),
          },
          nutritionTags: {
            type: "array",
            items: { type: "string", enum: NUTRITION_TAGS },
          },
          nutritionSummary: stringSchema("숫자를 제외한 정성적인 영양 구성 설명"),
          steps: {
            type: "array",
            items: stringSchema("초보자도 실행할 수 있는 한 단계의 조리 설명"),
          },
          safetyNotes: {
            type: "array",
            items: stringSchema("해당 레시피에 필요한 식품 안전 주의사항"),
          },
        },
        required: [
          "name",
          "servings",
          "requiredIngredients",
          "optionalIngredients",
          "cookingTime",
          "difficulty",
          "cookingMethod",
          "dishType",
          "effortLevel",
          "recommendationReasons",
          "nutritionTags",
          "nutritionSummary",
          "steps",
          "safetyNotes",
        ],
      },
    },
  },
  required: ["recipes"],
};
