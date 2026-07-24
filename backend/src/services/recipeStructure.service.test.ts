import assert from "node:assert/strict";
import test from "node:test";

import { structureRecipe } from "./recipeStructure.service.js";

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
