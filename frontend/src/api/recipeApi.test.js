import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRecipe,
  structureRecipe,
  getRecipeDetail,
  updateRecipe,
} from "./recipeApi";

describe("structureRecipe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Firebase ID 토큰과 입력값으로 AI 구조화 API를 호출한다", async () => {
    const structuredRecipe = {
      draft: {
        title: "김치찌개",
        description: null,
        servings: "2인분",
        cookingTimeMinutes: 30,
        ingredients: [
          { name: "김치", amount: "200", unit: "g", order: 1 },
        ],
        steps: [{ order: 1, description: "김치를 볶는다." }],
        source: null,
      },
      warnings: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: structuredRecipe }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      structureRecipe("firebase-token", {
        sourceUrl: null,
        rawText: "김치를 볶아 끓인다.",
      }),
    ).resolves.toEqual(structuredRecipe);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [path, request] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/ai/recipes/structure");
    expect(request.method).toBe("POST");
    expect(request.headers.get("Authorization")).toBe(
      "Bearer firebase-token",
    );
    expect(JSON.parse(request.body)).toEqual({
      sourceUrl: null,
      rawText: "김치를 볶아 끓인다.",
    });
  });

  it("서버 오류 코드를 호출자에게 전달한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "URL_FETCH_FAILED",
              message: "URL을 가져오지 못했습니다. 직접 입력해 주세요.",
            },
          }),
          {
            status: 422,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await expect(
      structureRecipe("firebase-token", {
        sourceUrl: "https://example.com/recipe",
        rawText: null,
      }),
    ).rejects.toMatchObject({
      code: "URL_FETCH_FAILED",
      status: 422,
    });
  });
});

describe("createRecipe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Firebase ID 토큰과 수정한 전체 초안으로 저장 API를 호출한다", async () => {
    const recipeRequest = {
      title: "김치찌개",
      description: null,
      servings: "2인분",
      cookingTimeMinutes: 30,
      ingredients: [
        { name: "김치", amount: "200", unit: "g", order: 1 },
      ],
      steps: [{ order: 1, description: "김치를 볶는다." }],
      source: null,
      memo: null,
    };
    const createdRecipe = {
      id: "recipe-id",
      type: "OWNED",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: createdRecipe }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createRecipe("firebase-token", recipeRequest),
    ).resolves.toEqual(createdRecipe);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [path, request] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/recipes");
    expect(request.method).toBe("POST");
    expect(request.headers.get("Authorization")).toBe(
      "Bearer firebase-token",
    );
    expect(JSON.parse(request.body)).toEqual(recipeRequest);
  });
});

describe("getRecipeDetail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Firebase ID 토큰으로 레시피 상세 API를 호출하고 상세 데이터를 반환한다", async () => {
    const recipeDetail = {
      id: "recipe-id",
      ownerId: "user-id",
      type: "OWNED",
      title: "김치찌개",
      description: null,
      servings: "2인분",
      cookingTimeMinutes: 30,
      ingredients: [
        { name: "김치", amount: "200", unit: "g", order: 1 },
      ],
      steps: [{ order: 1, description: "김치를 볶는다." }],
      source: null,
      memo: null,
      receivedInfo: null,
      createdAt: "2026-07-13T12:30:00.000Z",
      updatedAt: "2026-07-13T12:30:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: recipeDetail }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getRecipeDetail("firebase-token", "recipe-id"),
    ).resolves.toEqual(recipeDetail);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [path, request] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/recipes/recipe-id");
    expect(request.method).toBe("GET");
    expect(request.headers.get("Authorization")).toBe(
      "Bearer firebase-token",
    );
  });
});

describe("updateRecipe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Firebase ID 토큰과 편집 가능한 전체 본문으로 레시피 수정 API를 호출한다", async () => {
    const recipeRequest = {
      title: "수정한 김치찌개",
      description: "돼지고기를 넣은 김치찌개",
      servings: "3인분",
      cookingTimeMinutes: 35,
      ingredients: [
        { name: "김치", amount: "250", unit: "g", order: 1 },
      ],
      steps: [{ order: 1, description: "김치를 충분히 볶는다." }],
      source: {
        url: "https://example.com/updated-recipe",
        title: "수정한 원본",
        author: "요리 연구가",
      },
    };
    const updatedRecipe = {
      id: "recipe-id",
      type: "EXTERNAL",
      updatedAt: "2026-07-27T10:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: updatedRecipe }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateRecipe("firebase-token", "recipe-id", recipeRequest),
    ).resolves.toEqual(updatedRecipe);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [path, request] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/recipes/recipe-id");
    expect(request.method).toBe("PATCH");
    expect(request.headers.get("Authorization")).toBe(
      "Bearer firebase-token",
    );
    expect(JSON.parse(request.body)).toEqual(recipeRequest);
  });
});
