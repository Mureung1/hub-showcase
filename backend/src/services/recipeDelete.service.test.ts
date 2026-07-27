import assert from "node:assert/strict";
import test from "node:test";
import type { Pool, PoolClient, QueryResult } from "pg";

import { deleteRecipe } from "./recipeDelete.service.js";
import { RecipeNotFoundError } from "./recipeDetail.service.js";

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
  const actorUserId = "22222222-2222-4222-8222-222222222222";
  const deletedAt = new Date("2026-07-27T10:00:00.000Z");

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
            existingType === null
              ? []
              : [{ type: existingType, actor_user_id: actorUserId }],
        } as QueryResult<{
          type: RecipeType;
          actor_user_id: string;
        }>;
      }

      if (normalizedSql.startsWith("UPDATE recipes")) {
        return {
          rows: [{ deleted_at: deletedAt }],
        } as QueryResult<{ deleted_at: Date }>;
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
    actorUserId,
    deletedAt,
    get connectCount() {
      return connectCount;
    },
    get releaseCount() {
      return releaseCount;
    },
  };
}

const recipeId = "11111111-1111-4111-8111-111111111111";

for (const recipeType of [
  "OWNED",
  "EXTERNAL",
  "RECEIVED",
] as const) {
  test(`${recipeType} 소유 레시피를 soft delete하고 감사 이벤트를 기록한다`, async () => {
    const database = createPoolMock({ existingType: recipeType });

    const result = await deleteRecipe(
      database.pool,
      "firebase-user-id",
      recipeId,
    );

    assert.deepEqual(result, {
      id: recipeId,
      type: recipeType,
      deletedAt: database.deletedAt.toISOString(),
      restoreUntil: "2026-08-26T10:00:00.000Z",
    });
    assert.equal(database.connectCount, 1);
    assert.equal(database.releaseCount, 1);
    assert.deepEqual(
      database.queries.map(({ sql }) => sql.split(" ")[0]),
      ["BEGIN", "SELECT", "UPDATE", "INSERT", "COMMIT"],
    );
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
    assert.match(
      database.queries[2]?.sql ?? "",
      /deleted_at = CURRENT_TIMESTAMP/,
    );
    assert.match(
      database.queries[2]?.sql ?? "",
      /updated_at = CURRENT_TIMESTAMP/,
    );
    assert.deepEqual(database.queries[2]?.values, [recipeId]);
    assert.match(
      String(database.queries[3]?.values[0]),
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    assert.match(
      database.queries[3]?.sql ?? "",
      /^INSERT INTO recipe_audit_events/,
    );
    assert.deepEqual(database.queries[3]?.values.slice(1), [
      recipeId,
      database.actorUserId,
      "DELETED",
    ]);
  });
}

test("없는·타인 소유·이미 삭제된 레시피를 같은 not-found로 숨긴다", async () => {
  for (const hiddenState of [
    "없는 레시피",
    "타인 소유 레시피",
    "이미 삭제된 레시피",
  ]) {
    const database = createPoolMock({ existingType: null });

    await assert.rejects(
      () =>
        deleteRecipe(
          database.pool,
          "firebase-user-id",
          recipeId,
        ),
      RecipeNotFoundError,
      hiddenState,
    );
    assert.equal(database.queries.at(-1)?.sql, "ROLLBACK");
    assert.equal(database.releaseCount, 1);
    assert.equal(
      database.queries.some(({ sql }) => sql === "COMMIT"),
      false,
    );
  }
});

test("잘못된 UUID는 데이터베이스 연결 전에 not-found로 거부한다", async () => {
  const database = createPoolMock();

  await assert.rejects(
    () =>
      deleteRecipe(
        database.pool,
        "firebase-user-id",
        "not-a-uuid",
      ),
    RecipeNotFoundError,
  );
  assert.equal(database.connectCount, 0);
});

for (const failedStatement of [
  "UPDATE recipes",
  "INSERT INTO recipe_audit_events",
]) {
  test(`${failedStatement} 실패 시 롤백하고 연결을 해제한다`, async () => {
    const database = createPoolMock({ failOnSql: failedStatement });

    await assert.rejects(
      () =>
        deleteRecipe(
          database.pool,
          "firebase-user-id",
          recipeId,
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
}
