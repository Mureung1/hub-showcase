import { z } from "zod";

export const RECOMMENDATION_MODES = ["noFire", "quick", "balanced"];
export const DISH_TYPES = [
  "stirFry",
  "riceBowl",
  "soup",
  "stew",
  "noodle",
  "salad",
  "sandwich",
  "sideDish",
  "mealSet",
  "other",
];
export const SERVING_STYLES = ["singleDish", "mealSet"];
export const COOKING_TECHNIQUES = [
  "noCook",
  "mix",
  "microwave",
  "panFry",
  "stirFry",
  "boil",
  "stew",
  "grill",
  "other",
];
export const MEAL_COMPONENT_ROLES = ["staple", "main", "side", "dessert"];
export const NUTRITION_TAGS = [
  "nutrition:carb",
  "nutrition:protein",
  "nutrition:vegetable",
  "nutrition:fat",
];

const futurePreferenceSchema = z.array(z.string().trim().min(1).max(100)).max(20).default([]);

export const recommendationRequestSchema = z.object({
  mode: z.enum(RECOMMENDATION_MODES).default("quick"),
  maxMissingIngredients: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
  batchSize: z.literal(3).default(3),
  batchNumber: z.number().int().min(1).max(5).default(1),
  excludedRecipeFingerprints: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(12).default([]),
  allergens: futurePreferenceSchema,
  excludedIngredients: futurePreferenceSchema,
  dietaryPreferences: futurePreferenceSchema,
}).strict().superRefine((request, context) => {
  if (request.batchNumber === 1 && request.excludedRecipeFingerprints.length > 0) {
    context.addIssue({
      code: "custom",
      path: ["excludedRecipeFingerprints"],
      message: "첫 추천 요청에는 제외할 레시피 fingerprint를 전달할 수 없습니다.",
    });
  }
  if (request.batchNumber > 1 && request.excludedRecipeFingerprints.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["excludedRecipeFingerprints"],
      message: "추가 추천 요청에는 이전 레시피 fingerprint가 필요합니다.",
    });
  }
});

export const generatedIngredientSchema = z.object({
  name: z.string().trim().min(1).max(100),
  amount: z.number().positive().max(100_000),
  unit: z.string().trim().min(1).max(30),
}).strict();

export const generatedSubstitutionSchema = z.object({
  ingredient: z.string().trim().min(1).max(100),
  alternatives: z.array(z.string().trim().min(1).max(100)).min(1).max(3),
  note: z.string().trim().min(1).max(200),
}).strict();

export const generatedMealComponentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  role: z.enum(MEAL_COMPONENT_ROLES),
  ingredientNames: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
}).strict();

export const generatedRecipeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(1).max(500),
  servings: z.literal(1),
  servingStyle: z.enum(SERVING_STYLES),
  cookingTechnique: z.enum(COOKING_TECHNIQUES),
  primaryIngredients: z.array(z.string().trim().min(1).max(100)).min(1).max(3),
  components: z.array(generatedMealComponentSchema).max(5),
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
  substitutions: z.array(generatedSubstitutionSchema).max(5),
  steps: z.array(z.string().trim().min(1).max(300)).min(2).max(10),
  safetyNotes: z.array(z.string().trim().min(1).max(300)).max(3),
}).strict().superRefine((recipe, context) => {
  if (recipe.servingStyle === "mealSet" && recipe.components.length < 2) {
    context.addIssue({
      code: "custom",
      path: ["components"],
      message: "한 상 구성은 두 개 이상의 구성 요소가 필요합니다.",
    });
  }
  if (recipe.servingStyle === "singleDish" && recipe.components.length > 0) {
    context.addIssue({
      code: "custom",
      path: ["components"],
      message: "단일 요리는 별도 구성 요소를 포함하지 않습니다.",
    });
  }
});

export const generatedRecommendationSchema = z.object({
  recipes: z.array(generatedRecipeSchema).max(3),
  generationSummary: z.object({
    requestedCount: z.literal(3),
    returnedCount: z.number().int().min(0).max(3),
    stopReason: z.enum(["targetMet", "qualityLimit", "noSuitableRecipe"]),
  }).strict(),
}).strict().superRefine((result, context) => {
  if (result.generationSummary.returnedCount !== result.recipes.length) {
    context.addIssue({
      code: "custom",
      path: ["generationSummary", "returnedCount"],
      message: "반환 개수는 실제 레시피 개수와 같아야 합니다.",
    });
  }
  if (result.recipes.length === 3 && result.generationSummary.stopReason !== "targetMet") {
    context.addIssue({
      code: "custom",
      path: ["generationSummary", "stopReason"],
      message: "레시피 3개를 반환했다면 목표 달성으로 표시해야 합니다.",
    });
  }
  if (result.recipes.length > 0 && result.recipes.length < 3
    && result.generationSummary.stopReason !== "qualityLimit") {
    context.addIssue({
      code: "custom",
      path: ["generationSummary", "stopReason"],
      message: "레시피를 적게 반환했다면 품질 제한으로 표시해야 합니다.",
    });
  }
  if (result.recipes.length === 0 && result.generationSummary.stopReason !== "noSuitableRecipe") {
    context.addIssue({
      code: "custom",
      path: ["generationSummary", "stopReason"],
      message: "추천이 없다면 적합한 레시피 없음으로 표시해야 합니다.",
    });
  }
});

export const recommendationRecipeSchema = generatedRecipeSchema.extend({
  id: z.string().startsWith("recipe-"),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  missingIngredients: z.array(z.string().trim().min(1).max(100)).max(2),
}).strict();

export const recommendationRecipesSchema = z.array(recommendationRecipeSchema).max(3);

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

const mealComponentJsonSchema = {
  type: "object",
  properties: {
    name: stringSchema("밥, 주반찬, 곁들임, 후식처럼 한 상을 이루는 구성 요소 이름"),
    role: { type: "string", enum: MEAL_COMPONENT_ROLES },
    ingredientNames: {
      type: "array",
      items: stringSchema("해당 구성 요소에 실제로 사용하는 재료명"),
    },
  },
  required: ["name", "role", "ingredientNames"],
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
          description: stringSchema("음식의 맛과 특징, 어떤 한 끼에 어울리는지 설명하는 짧은 소개"),
          servings: { type: "integer", description: "항상 1인분" },
          servingStyle: { type: "string", enum: SERVING_STYLES },
          cookingTechnique: { type: "string", enum: COOKING_TECHNIQUES },
          primaryIngredients: {
            type: "array",
            items: stringSchema("메뉴 정체성을 결정하는 핵심 재료명"),
          },
          components: {
            type: "array",
            items: mealComponentJsonSchema,
          },
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
          substitutions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ingredient: stringSchema("대체가 필요한 원재료명"),
                alternatives: {
                  type: "array",
                  items: stringSchema("대체 가능한 재료명"),
                },
                note: stringSchema("대체 시 맛·식감 변화 등 짧은 안내"),
              },
              required: ["ingredient", "alternatives", "note"],
            },
          },
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
          "description",
          "servings",
          "servingStyle",
          "cookingTechnique",
          "primaryIngredients",
          "components",
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
          "substitutions",
          "steps",
          "safetyNotes",
        ],
      },
    },
    generationSummary: {
      type: "object",
      properties: {
        requestedCount: { type: "integer", description: "항상 요청한 목표 개수 3" },
        returnedCount: { type: "integer", description: "실제로 품질 기준을 통과해 반환한 개수" },
        stopReason: {
          type: "string",
          enum: ["targetMet", "qualityLimit", "noSuitableRecipe"],
        },
      },
      required: ["requestedCount", "returnedCount", "stopReason"],
    },
  },
  required: ["recipes", "generationSummary"],
};
