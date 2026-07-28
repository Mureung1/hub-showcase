import assert from "node:assert/strict";
import test from "node:test";

import {
  RecipeStructureError,
  structureRecipe,
} from "./recipeStructure.service.js";

test("OpenAI 구조화 결과에 검증된 YouTube 출처를 주입한다", async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "openai-api-key";

  let requestCount = 0;

  const fetchMock = (async () => {
    requestCount += 1;

    return new Response(
      JSON.stringify({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  draft: {
                    title: "김치찌개",
                    description: null,
                    servings: null,
                    cookingTimeMinutes: null,
                    source: null,
                    ingredients: [
                      {
                        name: "김치",
                        amount: "200",
                        unit: "g",
                        order: 1,
                      },
                    ],
                    steps: [
                      {
                        order: 1,
                        description: "재료를 넣고 끓인다.",
                      },
                    ],
                  },
                  warnings: [],
                }),
              },
            ],
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }) as typeof fetch;

  try {
    const source = {
      url: "https://youtu.be/dQw4w9WgXcQ",
      title: "김치찌개 만들기",
      author: "우리집 요리",
    };

    const result = await structureRecipe(
      "김치 200g\n재료를 넣고 끓인다.",
      source,
      fetchMock,
    );

    assert.deepEqual(result.draft.source, source);
    assert.equal(requestCount, 1);
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  }
});

test("검증 실패 시 AI 원문 없이 실패 이유만 로그에 남긴다", async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalWarn = console.warn;
  process.env.OPENAI_API_KEY = "openai-api-key";

  let warningArguments: unknown[] = [];
  console.warn = (...arguments_: unknown[]) => {
    warningArguments = arguments_;
  };

  const fetchMock = (async () =>
    new Response(
      JSON.stringify({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  draft: {
                    title: "김치찌개",
                    description: null,
                    servings: null,
                    cookingTimeMinutes: null,
                    source: null,
                    ingredients: [
                      {
                        name: "김치",
                        amount: "200",
                        unit: "g",
                        order: 2,
                      },
                    ],
                    steps: [
                      {
                        order: 1,
                        description: "재료를 넣고 끓인다.",
                      },
                    ],
                  },
                  warnings: [],
                }),
              },
            ],
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_diagnostic",
        },
      },
    )) as typeof fetch;

  try {
    await assert.rejects(
      structureRecipe("민감한 레시피 원문", null, fetchMock),
      (error) =>
        error instanceof RecipeStructureError &&
        error.code === "AI_RESPONSE_INVALID",
    );

    assert.deepEqual(warningArguments, [
      "OpenAI structured response failed validation.",
      {
        reason: "ingredient_order",
        requestId: "req_diagnostic",
      },
    ]);
    assert.equal(JSON.stringify(warningArguments).includes("민감한"), false);
  } finally {
    console.warn = originalWarn;

    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  }
});
