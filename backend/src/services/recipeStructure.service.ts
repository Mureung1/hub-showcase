import {
  getStructureRecipeValidationFailure,
  RECIPE_STRUCTURE_SCHEMA,
  isStructureRecipeResult,
  type RecipeSource,
  type StructureRecipeResult,
} from "./recipeStructureContract.js";

export type RecipeStructureErrorCode =
  | "AI_REQUEST_FAILED"
  | "AI_RESPONSE_INVALID";

export class RecipeStructureError extends Error {
  constructor(public readonly code: RecipeStructureErrorCode) {
    super(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractOutputText(value: unknown): string | null {
  if (!isRecord(value) || !Array.isArray(value.output)) {
    return null;
  }

  for (const output of value.output) {
    if (!isRecord(output) || !Array.isArray(output.content)) {
      continue;
    }

    for (const content of output.content) {
      if (
        isRecord(content) &&
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }

  return null;
}


export async function structureRecipe(
  rawText: string,
  recipeSource: RecipeSource | null = null,
  fetchImpl: typeof fetch = fetch,
): Promise<StructureRecipeResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new RecipeStructureError("AI_REQUEST_FAILED");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        input: [
          {
            role: "system",
            content:
              "사용자의 레시피 원문을 편집 가능한 레시피 초안으로 구조화한다. " +
              "source는 서버가 설정하므로 항상 null로 반환한다. " +
              "조리 팁과 서버 전용 필드는 추가하지 않는다. " +
              "ingredients와 steps의 각 order는 배열 순서와 일치하도록 1부터 중복과 누락 없이 연속으로 지정한다. " +
              "title, ingredients의 name, steps의 description, warnings의 field와 message는 공백을 제거한 뒤에도 비어 있지 않아야 한다. " +
              "warnings의 field는 title, description, servings, cookingTimeMinutes 또는 실제 존재하는 ingredients[n].name, ingredients[n].amount, ingredients[n].unit, steps[n].description 형식만 사용하고 draft. 접두사를 붙이지 않는다. " +
              "모호한 값을 추정하면 해당 편집 필드 경로와 이유를 warnings에 포함하고, 경고가 없으면 빈 배열로 반환한다. " +
              "응답을 반환하기 전에 위 규칙과 JSON Schema를 모두 만족하는지 확인한다.",
          },
          {
            role: "user",
            content: rawText,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "recipe_structure",
            strict: true,
            schema: RECIPE_STRUCTURE_SCHEMA,
          },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("OpenAI Responses API request failed.", {
        status: response.status,
        requestId: response.headers.get("x-request-id"),
      });
      throw new RecipeStructureError("AI_REQUEST_FAILED");
    }

    let responseBody: unknown;

    try {
      responseBody = await response.json();
    } catch {
      throw new RecipeStructureError("AI_REQUEST_FAILED");
    }

    const outputText = extractOutputText(responseBody);

    if (!outputText) {
      throw new RecipeStructureError("AI_REQUEST_FAILED");
    }

    let parsedResult: unknown;

    try {
      parsedResult = JSON.parse(outputText);
    } catch {
      throw new RecipeStructureError("AI_RESPONSE_INVALID");
    }

    if (!isStructureRecipeResult(parsedResult)) {
      console.warn("OpenAI structured response failed validation.", {
        reason: getStructureRecipeValidationFailure(parsedResult),
        requestId: response.headers.get("x-request-id"),
      });
      throw new RecipeStructureError("AI_RESPONSE_INVALID");
    }

    return {
      ...parsedResult,
      draft: {
        ...parsedResult.draft,
        source: recipeSource,
      },
    };
  } catch (error) {
    if (error instanceof RecipeStructureError) {
      throw error;
    }

    throw new RecipeStructureError("AI_REQUEST_FAILED");
  } finally {
    clearTimeout(timeoutId);
  }
}
