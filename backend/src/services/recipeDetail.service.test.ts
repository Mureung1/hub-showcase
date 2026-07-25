import assert from "node:assert/strict";
import test from "node:test";
import type { Pool, QueryResult } from "pg";

import {
  getRecipeDetail,
  RecipeNotFoundError,
} from "./recipeDetail.service.js";

type RecordedQuery = {
  sql: string;
  values: readonly unknown[];
};

function createPoolMock(resultRows: unknown[][]) {
  const queries: RecordedQuery[] = [];
  const remainingRows = [...resultRows];

  const pool = {
    async query(sql: string, values: readonly unknown[] = []) {
      queries.push({
        sql: sql.replace(/\s+/g, " ").trim(),
        values,
      });

      return {
        rows: remainingRows.shift() ?? [],
      } as unknown as QueryResult;
    },
  } as unknown as Pick<Pool, "query">;

  return { pool, queries };
}

const recipeId = "11111111-1111-4111-8111-111111111111";
const firebaseUid = "firebase-user-id";

test("소유한 활성 레시피를 정렬된 하위 데이터와 출처를 포함해 반환한다", async () => {
  const createdAt = new Date("2026-07-24T01:00:00.000Z");
  const updatedAt = new Date("2026-07-24T02:00:00.000Z");
  const database = createPoolMock([
    [
      {
        id: recipeId,
        owner_id: "owner-id",
        type: "EXTERNAL",
        title: "Kimchi stew",
        description: "Description",
        servings: "2 servings",
        cooking_time_minutes: 30,
        memo: "More tofu next time",
        source_url: "https://example.com/recipe",
        source_title: "Source title",
        source_author: "Source author",
        created_at: createdAt,
        updated_at: updatedAt,
      },
    ],
    [
      {
        name: "Kimchi",
        amount: "200",
        unit: "g",
        position: 1,
      },
      {
        name: "Water",
        amount: "2",
        unit: "cups",
        position: 2,
      },
    ],
    [
      { position: 1, description: "Cook the kimchi." },
      { position: 2, description: "Add water and simmer." },
    ],
  ]);

  const result = await getRecipeDetail(
    database.pool,
    firebaseUid,
    recipeId,
  );

  assert.deepEqual(result, {
    id: recipeId,
    ownerId: "owner-id",
    type: "EXTERNAL",
    title: "Kimchi stew",
    description: "Description",
    servings: "2 servings",
    cookingTimeMinutes: 30,
    ingredients: [
      { name: "Kimchi", amount: "200", unit: "g", order: 1 },
      { name: "Water", amount: "2", unit: "cups", order: 2 },
    ],
    steps: [
      { order: 1, description: "Cook the kimchi." },
      { order: 2, description: "Add water and simmer." },
    ],
    source: {
      url: "https://example.com/recipe",
      title: "Source title",
      author: "Source author",
    },
    memo: "More tofu next time",
    receivedInfo: null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  });

  assert.equal(database.queries.length, 3);
  assert.deepEqual(database.queries[0]?.values, [recipeId, firebaseUid]);
  assert.match(
    database.queries[0]?.sql ?? "",
    /users\.firebase_uid = \$2/,
  );
  assert.match(
    database.queries[0]?.sql ?? "",
    /recipes\.deleted_at IS NULL/,
  );
  assert.match(
    database.queries[1]?.sql ?? "",
    /ORDER BY position ASC/,
  );
  assert.match(
    database.queries[2]?.sql ?? "",
    /ORDER BY position ASC/,
  );
});

test("출처가 없는 레시피는 source를 null로 반환한다", async () => {
  const database = createPoolMock([
    [
      {
        id: recipeId,
        owner_id: "owner-id",
        type: "OWNED",
        title: "Home recipe",
        description: null,
        servings: null,
        cooking_time_minutes: null,
        memo: null,
        source_url: null,
        source_title: null,
        source_author: null,
        created_at: new Date("2026-07-24T01:00:00.000Z"),
        updated_at: new Date("2026-07-24T01:00:00.000Z"),
      },
    ],
    [],
    [],
  ]);

  const result = await getRecipeDetail(
    database.pool,
    firebaseUid,
    recipeId,
  );

  assert.equal(result.source, null);
  assert.deepEqual(result.ingredients, []);
  assert.deepEqual(result.steps, []);
});

for (const inaccessibleCase of [
  "존재하지 않는 레시피",
  "다른 사용자 레시피",
  "삭제된 레시피",
]) {
  test(`${inaccessibleCase}는 같은 not-found 오류로 숨긴다`, async () => {
    const database = createPoolMock([[]]);

    await assert.rejects(
      () =>
        getRecipeDetail(database.pool, firebaseUid, recipeId),
      RecipeNotFoundError,
    );

    assert.equal(database.queries.length, 1);
  });
}

test("유효하지 않은 레시피 ID를 DB 조회 없이 not-found로 처리한다", async () => {
  const database = createPoolMock([]);

  await assert.rejects(
    () =>
      getRecipeDetail(database.pool, firebaseUid, "not-a-recipe-id"),
    RecipeNotFoundError,
  );

  assert.equal(database.queries.length, 0);
});
