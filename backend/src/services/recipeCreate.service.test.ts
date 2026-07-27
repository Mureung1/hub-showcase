import assert from "node:assert/strict";
import test from "node:test";
import type { Pool, PoolClient, QueryResult } from "pg";

import {
  createRecipe,
  RecipeCreateValidationError,
} from "./recipeCreate.service.js";
import { UrlContentError } from "./urlContent.service.js";

type RecordedQuery = {
  sql: string;
  values: readonly unknown[];
};

function createPoolMock(failOnSql?: string) {
  const queries: RecordedQuery[] = [];
  let connectCount = 0;
  let releaseCount = 0;

  const client = {
    async query(sql: string, values: readonly unknown[] = []) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();
      queries.push({ sql: normalizedSql, values });

      if (failOnSql && normalizedSql.includes(failOnSql)) {
        throw new Error("database failure");
      }

      if (normalizedSql.includes("INSERT INTO users")) {
        return {
          rows: [{ id: "user-id" }],
        } as QueryResult<{ id: string }>;
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
    get connectCount() {
      return connectCount;
    },
    get releaseCount() {
      return releaseCount;
    },
  };
}

const firebaseUser = {
  uid: "firebase-user-id",
  email: "user@example.com",
  name: "Recipe User",
  picture: "https://images.example.com/user.jpg",
};

function createValidRequest() {
  return {
    title: "  Kimchi stew  ",
    description: null,
    servings: null,
    cookingTimeMinutes: 0,
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
    memo: "   ",
  };
}

test("출처 없는 초안을 OWNED 레시피와 하위 데이터로 커밋한다", async () => {
  const database = createPoolMock();

  const result = await createRecipe(
    database.pool,
    firebaseUser,
    createValidRequest(),
  );

  assert.equal(result.type, "OWNED");
  assert.match(result.id, /^[0-9a-f-]{36}$/);
  assert.equal(database.connectCount, 1);
  assert.equal(database.releaseCount, 1);
  assert.equal(database.queries.length, 6);
  assert.equal(database.queries[0]?.sql, "BEGIN");
  assert.match(database.queries[1]?.sql ?? "", /INSERT INTO users/);
  assert.match(database.queries[2]?.sql ?? "", /INSERT INTO recipes/);
  assert.match(database.queries[3]?.sql ?? "", /INSERT INTO ingredients/);
  assert.match(database.queries[4]?.sql ?? "", /INSERT INTO recipe_steps/);
  assert.equal(database.queries[5]?.sql, "COMMIT");

  const userQuery = database.queries[1];
  const recipeQuery = database.queries[2];
  const ingredientQuery = database.queries[3];
  const stepQuery = database.queries[4];

  assert.deepEqual(userQuery?.values.slice(1), [
    firebaseUser.uid,
    firebaseUser.email,
    firebaseUser.name,
    firebaseUser.picture,
  ]);
  assert.deepEqual(recipeQuery?.values.slice(1), [
    "user-id",
    "OWNED",
    "Kimchi stew",
    null,
    null,
    0,
    null,
  ]);
  assert.deepEqual(ingredientQuery?.values.slice(1), [
    1,
    "Kimchi",
    "200",
    "g",
  ]);
  assert.deepEqual(stepQuery?.values.slice(1), [1, "Simmer it."]);
});

test("안전한 출처가 있으면 EXTERNAL 레시피와 출처를 저장한다", async () => {
  const database = createPoolMock();
  const request = {
    ...createValidRequest(),
    source: {
      url: " https://8.8.8.8/recipe ",
      title: "  Source title  ",
      author: "  Source author  ",
    },
  };

  const result = await createRecipe(database.pool, firebaseUser, request);

  assert.equal(result.type, "EXTERNAL");

  const sourceQuery = database.queries.find(({ sql }) =>
    sql.includes("INSERT INTO recipe_sources"),
  );

  assert.deepEqual(sourceQuery?.values.slice(1), [
    "https://8.8.8.8/recipe",
    "Source title",
    "Source author",
  ]);
  assert.equal(database.queries.at(-1)?.sql, "COMMIT");
});

test("계약 밖 서버 필드와 잘못된 요청 전체를 연결 전에 거부한다", async () => {
  const invalidRequests: unknown[] = [
    null,
    { ...createValidRequest(), ownerId: "forged-user" },
    { ...createValidRequest(), type: "RECEIVED" },
    { ...createValidRequest(), title: " " },
    { ...createValidRequest(), ingredients: "Kimchi" },
    { ...createValidRequest(), steps: [] },
    { ...createValidRequest(), cookingTimeMinutes: -1 },
    {
      ...createValidRequest(),
      ingredients: [
        { name: "Kimchi", amount: null, unit: null, order: 2 },
        { name: " ", amount: null, unit: null, order: 1 },
      ],
    },
    {
      ...createValidRequest(),
      steps: [
        { order: 1, description: "First" },
        { order: 1, description: "Second" },
      ],
    },
    {
      ...createValidRequest(),
      source: {
        url: "https://8.8.8.8/recipe",
        title: null,
        author: null,
        extra: true,
      },
    },
  ];

  for (const request of invalidRequests) {
    const database = createPoolMock();

    await assert.rejects(
      () => createRecipe(database.pool, firebaseUser, request),
      RecipeCreateValidationError,
    );
    assert.equal(database.connectCount, 0);
  }
});

test("잘못되거나 내부망인 출처 URL을 안정적인 URL 오류로 거부한다", async () => {
  const invalidUrlRequest = {
    ...createValidRequest(),
    source: {
      url: "ftp://example.com/recipe",
      title: null,
      author: null,
    },
  };
  const blockedUrlRequest = {
    ...createValidRequest(),
    source: {
      url: "http://127.0.0.1/recipe",
      title: null,
      author: null,
    },
  };

  for (const [request, expectedCode] of [
    [invalidUrlRequest, "INVALID_URL"],
    [blockedUrlRequest, "URL_NOT_ALLOWED"],
  ] as const) {
    const database = createPoolMock();

    await assert.rejects(
      () => createRecipe(database.pool, firebaseUser, request),
      (error) =>
        error instanceof UrlContentError &&
        error.code === expectedCode,
    );
    assert.equal(database.connectCount, 0);
  }
});

test("하위 데이터 저장 실패 시 전체 트랜잭션을 롤백하고 연결을 반환한다", async () => {
  const database = createPoolMock("INSERT INTO recipe_steps");

  await assert.rejects(
    () =>
      createRecipe(database.pool, firebaseUser, createValidRequest()),
    /database failure/,
  );

  assert.equal(database.queries.at(-1)?.sql, "ROLLBACK");
  assert.equal(database.queries.some(({ sql }) => sql === "COMMIT"), false);
  assert.equal(database.releaseCount, 1);
});
