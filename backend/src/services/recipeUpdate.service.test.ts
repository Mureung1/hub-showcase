import assert from "node:assert/strict";
import test from "node:test";
import type { Pool, PoolClient, QueryResult } from "pg";

import {
  RecipeNotEditableError,
  RecipeUpdateValidationError,
  updateRecipe,
} from "./recipeUpdate.service.js";
import { RecipeNotFoundError } from "./recipeDetail.service.js";
import { UrlContentError } from "./urlContent.service.js";

type RecipeType = "OWNED" | "EXTERNAL" | "RECEIVED";

type RecordedQuery = {
  sql: string;
  values: readonly unknown[];
};

function createPoolMock({
  existingType = "OWNED",
  failOnSql,
}: {
  existingType?: RecipeType | null;
  failOnSql?: string;
} = {}) {
  const queries: RecordedQuery[] = [];
  let connectCount = 0;
  let releaseCount = 0;
  const updatedAt = new Date("2026-07-27T10:00:00.000Z");

  const client = {
    async query(sql: string, values: readonly unknown[] = []) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();
      queries.push({ sql: normalizedSql, values });

      if (failOnSql && normalizedSql.includes(failOnSql)) {
        throw new Error("database failure");
      }

      if (normalizedSql.startsWith("SELECT recipes.type")) {
        return {
          rows:
            existingType === null ? [] : [{ type: existingType }],
        } as QueryResult<{ type: RecipeType }>;
      }

      if (normalizedSql.startsWith("UPDATE recipes")) {
        return {
          rows: [{ updated_at: updatedAt }],
        } as QueryResult<{ updated_at: Date }>;
      }

      return { rows: [] } as unknown as QueryResult<never>;
    },
    release() {
      releaseCount += 1;
    },
  } as unknown as PoolClient;

  const pool = {
    async connect() {
      connectCount += 1;
      return client;
    },
  } as unknown as Pick<Pool, "connect">;

  return {
    pool,
    queries,
    updatedAt,
    get connectCount() {
      return connectCount;
    },
    get releaseCount() {
      return releaseCount;
    },
  };
}

const recipeId = "11111111-1111-4111-8111-111111111111";

function createValidRequest() {
  return {
    title: "  Updated stew  ",
    description: "  Rich broth  ",
    servings: "  2 servings  ",
    cookingTimeMinutes: 2_147_483_647,
    ingredients: [
      {
        name: "  Kimchi  ",
        amount: " 200 ",
        unit: " g ",
        order: 1,
      },
      {
        name: "   ",
        amount: null,
        unit: null,
        order: 2,
      },
    ],
    steps: [
      {
        order: 1,
        description: "  Simmer it.  ",
      },
      {
        order: 2,
        description: "   ",
      },
    ],
    source: null,
  };
}

test("EXTERNAL 레시피의 본문과 하위 데이터를 교체하고 source가 없으면 OWNED로 바꾼다", async () => {
  const database = createPoolMock({ existingType: "EXTERNAL" });

  const result = await updateRecipe(
    database.pool,
    "firebase-user-id",
    recipeId,
    createValidRequest(),
  );

  assert.deepEqual(result, {
    id: recipeId,
    type: "OWNED",
    updatedAt: database.updatedAt.toISOString(),
  });
  assert.equal(database.connectCount, 1);
  assert.equal(database.releaseCount, 1);
  assert.equal(database.queries[0]?.sql, "BEGIN");
  assert.match(
    database.queries[1]?.sql ?? "",
    /users\.firebase_uid = \$2/,
  );
  assert.match(
    database.queries[1]?.sql ?? "",
    /recipes\.deleted_at IS NULL/,
  );
  assert.match(database.queries[1]?.sql ?? "", /FOR UPDATE$/);
  assert.deepEqual(database.queries[1]?.values, [
    recipeId,
    "firebase-user-id",
  ]);

  const recipeQuery = database.queries.find(({ sql }) =>
    sql.startsWith("UPDATE recipes"),
  );
  assert.deepEqual(recipeQuery?.values, [
    recipeId,
    "OWNED",
    "Updated stew",
    "Rich broth",
    "2 servings",
    2_147_483_647,
  ]);
  assert.equal(
    database.queries.some(({ sql }) =>
      sql.startsWith("DELETE FROM ingredients"),
    ),
    true,
  );
  assert.equal(
    database.queries.some(({ sql }) =>
      sql.startsWith("DELETE FROM recipe_steps"),
    ),
    true,
  );
  assert.equal(
    database.queries.some(({ sql }) =>
      sql.startsWith("DELETE FROM recipe_sources"),
    ),
    true,
  );

  const ingredientQuery = database.queries.find(({ sql }) =>
    sql.startsWith("INSERT INTO ingredients"),
  );
  const stepQuery = database.queries.find(({ sql }) =>
    sql.startsWith("INSERT INTO recipe_steps"),
  );
  assert.deepEqual(ingredientQuery?.values, [
    recipeId,
    1,
    "Kimchi",
    "200",
    "g",
  ]);
  assert.deepEqual(stepQuery?.values, [
    recipeId,
    1,
    "Simmer it.",
  ]);
  assert.equal(
    database.queries.some(({ sql }) =>
      sql.startsWith("INSERT INTO recipe_sources"),
    ),
    false,
  );
  assert.equal(database.queries.at(-1)?.sql, "COMMIT");
});

test("OWNED 레시피에 안전한 source를 교체하면 EXTERNAL로 바꾼다", async () => {
  const database = createPoolMock({ existingType: "OWNED" });
  const request = {
    ...createValidRequest(),
    source: {
      url: " https://8.8.8.8/recipe ",
      title: "  Source title  ",
      author: "  Source author  ",
    },
  };

  const result = await updateRecipe(
    database.pool,
    "firebase-user-id",
    recipeId,
    request,
  );

  assert.equal(result.type, "EXTERNAL");
  const sourceQuery = database.queries.find(({ sql }) =>
    sql.startsWith("INSERT INTO recipe_sources"),
  );
  assert.deepEqual(sourceQuery?.values, [
    recipeId,
    "https://8.8.8.8/recipe",
    "Source title",
    "Source author",
  ]);
  assert.equal(database.queries.at(-1)?.sql, "COMMIT");
});

test("필수 필드 누락과 계약 밖 필드를 연결 전에 거부한다", async () => {
  const { source: _source, ...missingSource } =
    createValidRequest();
  const invalidRequests: unknown[] = [
    missingSource,
    { ...createValidRequest(), ownerId: "forged-owner" },
    { ...createValidRequest(), type: "RECEIVED" },
    { ...createValidRequest(), memo: "forged memo" },
  ];

  for (const request of invalidRequests) {
    const database = createPoolMock();

    await assert.rejects(
      () =>
        updateRecipe(
          database.pool,
          "firebase-user-id",
          recipeId,
          request,
        ),
      RecipeUpdateValidationError,
    );
    assert.equal(database.connectCount, 0);
  }
});

test("잘못되거나 내부망인 source URL을 연결 전에 거부한다", async () => {
  const requests = [
    [
      {
        ...createValidRequest(),
        source: {
          url: "ftp://example.com/recipe",
          title: null,
          author: null,
        },
      },
      "INVALID_URL",
    ],
    [
      {
        ...createValidRequest(),
        source: {
          url: "http://127.0.0.1/recipe",
          title: null,
          author: null,
        },
      },
      "URL_NOT_ALLOWED",
    ],
  ] as const;

  for (const [request, expectedCode] of requests) {
    const database = createPoolMock();

    await assert.rejects(
      () =>
        updateRecipe(
          database.pool,
          "firebase-user-id",
          recipeId,
          request,
        ),
      (error) =>
        error instanceof UrlContentError &&
        error.code === expectedCode,
    );
    assert.equal(database.connectCount, 0);
  }
});

test("소유한 RECEIVED 레시피는 원본 수정을 차단하고 롤백한다", async () => {
  const database = createPoolMock({ existingType: "RECEIVED" });

  await assert.rejects(
    () =>
      updateRecipe(
        database.pool,
        "firebase-user-id",
        recipeId,
        createValidRequest(),
      ),
    RecipeNotEditableError,
  );

  assert.equal(database.queries.at(-1)?.sql, "ROLLBACK");
  assert.equal(database.releaseCount, 1);
});

test("없는·타인 소유·삭제 레시피와 잘못된 UUID를 같은 not-found로 숨긴다", async () => {
  const hiddenRecipe = createPoolMock({ existingType: null });

  await assert.rejects(
    () =>
      updateRecipe(
        hiddenRecipe.pool,
        "firebase-user-id",
        recipeId,
        createValidRequest(),
      ),
    RecipeNotFoundError,
  );
  assert.equal(hiddenRecipe.queries.at(-1)?.sql, "ROLLBACK");

  const invalidIdRecipe = createPoolMock();
  await assert.rejects(
    () =>
      updateRecipe(
        invalidIdRecipe.pool,
        "firebase-user-id",
        "not-a-uuid",
        createValidRequest(),
      ),
    RecipeNotFoundError,
  );
  assert.equal(invalidIdRecipe.connectCount, 0);
});

test("하위 데이터 교체 실패 시 기존 레시피 전체를 롤백한다", async () => {
  const database = createPoolMock({
    failOnSql: "INSERT INTO recipe_steps",
  });

  await assert.rejects(
    () =>
      updateRecipe(
        database.pool,
        "firebase-user-id",
        recipeId,
        createValidRequest(),
      ),
    /database failure/,
  );

  assert.equal(database.queries.at(-1)?.sql, "ROLLBACK");
  assert.equal(
    database.queries.some(({ sql }) => sql === "COMMIT"),
    false,
  );
  assert.equal(database.releaseCount, 1);
});
