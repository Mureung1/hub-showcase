import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";
import type { Pool, PoolClient, QueryResult } from "pg";

import {
  acceptTransferInvitation,
  createTransferInvitation,
  getTransferInvitationByCode,
  getTransferInvitationByLink,
  getTransferInvitationCodeSecret,
  TransferInvitationError,
} from "./transferInvitation.service.js";

type RecordedQuery = {
  sql: string;
  values: readonly unknown[];
};

const CODE_SECRET = "a-secure-transfer-code-secret-32-bytes";

function createCreationPool(recipeType: "OWNED" | "EXTERNAL" | "RECEIVED" | null) {
  const queries: RecordedQuery[] = [];
  let releaseCount = 0;

  const client = {
    async query(sql: string, values: readonly unknown[] = []) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();
      queries.push({ sql: normalizedSql, values });

      if (normalizedSql.includes("FROM recipes")) {
        return {
          rows:
            recipeType === null
              ? []
              : [
                  {
                    id: "recipe-id",
                    type: recipeType,
                    title: "김치찌개",
                    description: "돼지고기를 넣은 김치찌개",
                    servings: "2인분",
                    cooking_time_minutes: 30,
                    source_url: null,
                    source_title: null,
                    source_author: null,
                    owner_name: "엄마",
                    owner_profile_image_url: null,
                  },
                ],
        } as QueryResult<never>;
      }

      if (normalizedSql.includes("FROM ingredients")) {
        return {
          rows: [
            {
              name: "김치",
              amount: "200",
              unit: "g",
              position: 1,
            },
          ],
        } as QueryResult<never>;
      }

      if (normalizedSql.includes("FROM recipe_steps")) {
        return {
          rows: [{ description: "끓인다.", position: 1 }],
        } as QueryResult<never>;
      }

      return { rows: [] } as unknown as QueryResult<never>;
    },
    release() {
      releaseCount += 1;
    },
  } as unknown as PoolClient;

  const pool = {
    async connect() {
      return client;
    },
  } as unknown as Pick<Pool, "connect">;

  return {
    pool,
    queries,
    get releaseCount() {
      return releaseCount;
    },
  };
}

function createPreviewPool(
  state: "ACTIVE" | "USED" | "EXPIRED" | "NOT_FOUND",
) {
  const queries: RecordedQuery[] = [];
  const now = Date.now();
  const result =
    state === "NOT_FOUND"
      ? []
      : [
          {
            id: "invitation-id",
            snapshot_version: 1,
            snapshot: {
              recipe: {
                title: "김치찌개",
                description: null,
                servings: "2인분",
                cookingTimeMinutes: 30,
                ingredients: [],
                steps: [],
                source: null,
              },
              originalOwner: {
                name: "엄마",
                profileImageUrl: null,
              },
            },
            expires_at: new Date(
              state === "EXPIRED" ? now - 1_000 : now + 60_000,
            ),
            used_at: state === "USED" ? new Date(now) : null,
          },
        ];

  const pool = {
    async query(sql: string, values: readonly unknown[] = []) {
      queries.push({
        sql: sql.replace(/\s+/g, " ").trim(),
        values,
      });
      return { rows: result } as unknown as QueryResult<never>;
    },
  } as unknown as Pick<Pool, "query">;

  return { pool, queries };
}

function createAcceptancePool(
  state: "ACTIVE" | "USED" | "EXPIRED" | "NOT_FOUND" | "SELF",
  failOnSql?: string,
) {
  const queries: RecordedQuery[] = [];
  let connectCount = 0;
  let releaseCount = 0;
  const now = Date.now();

  const client = {
    async query(sql: string, values: readonly unknown[] = []) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();
      queries.push({ sql: normalizedSql, values });

      if (failOnSql && normalizedSql.includes(failOnSql)) {
        throw new Error("database failure");
      }

      if (normalizedSql.includes("FROM transfer_invitations")) {
        return {
          rows:
            state === "NOT_FOUND"
              ? []
              : [
                  {
                    id: "11111111-1111-4111-8111-111111111111",
                    source_recipe_id:
                      "22222222-2222-4222-8222-222222222222",
                    original_owner_id:
                      state === "SELF" ? "recipient-id" : "original-owner-id",
                    snapshot: {
                      recipe: {
                        title: "김치찌개",
                        description: "돼지고기를 넣은 김치찌개",
                        servings: "2인분",
                        cookingTimeMinutes: 30,
                        ingredients: [
                          {
                            name: "김치",
                            amount: "200",
                            unit: "g",
                            order: 1,
                          },
                        ],
                        steps: [{ order: 1, description: "끓인다." }],
                        source: {
                          url: "https://example.com/kimchi",
                          title: "김치찌개",
                          author: "엄마",
                        },
                      },
                      originalOwner: {
                        name: "엄마",
                        profileImageUrl: null,
                      },
                    },
                    expires_at: new Date(
                      state === "EXPIRED" ? now - 1_000 : now + 60_000,
                    ),
                    used_at: state === "USED" ? new Date(now) : null,
                  },
                ],
        } as QueryResult<never>;
      }

      if (normalizedSql.includes("INSERT INTO users")) {
        return {
          rows: [{ id: "recipient-id" }],
        } as QueryResult<never>;
      }

      return { rows: [], rowCount: 1 } as unknown as QueryResult<never>;
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

const recipient = {
  uid: "recipient-firebase-uid",
  email: "recipient@example.com",
  name: "받는 사람",
  picture: "https://example.com/recipient.jpg",
};

test("OWNED 레시피 스냅샷과 원문 없는 해시를 저장하고 7일 초대를 반환한다", async () => {
  const database = createCreationPool("OWNED");
  const startedAt = Date.now();

  const invitation = await createTransferInvitation(
    database.pool,
    "firebase-user-id",
    "8fe1e897-bb99-4d8e-a59f-38de00c429bf",
    CODE_SECRET,
  );

  assert.match(invitation.invitationId, /^[0-9a-f-]{36}$/);
  assert.match(
    invitation.transferPath,
    /^\/transfer-invitations\/[A-Za-z0-9_-]{43}$/,
  );
  assert.match(invitation.invitationCode, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.ok(Date.parse(invitation.createdAt) >= startedAt);
  assert.equal(
    Date.parse(invitation.expiresAt) - Date.parse(invitation.createdAt),
    7 * 24 * 60 * 60 * 1_000,
  );
  assert.equal(database.releaseCount, 1);
  assert.equal(database.queries[0]?.sql, "BEGIN ISOLATION LEVEL REPEATABLE READ");
  assert.equal(database.queries.at(-1)?.sql, "COMMIT");

  const insertQuery = database.queries.find(({ sql }) =>
    sql.includes("INSERT INTO transfer_invitations"),
  );
  assert.ok(insertQuery);

  const rawLinkToken = invitation.transferPath.split("/").at(-1) ?? "";
  const normalizedCode = invitation.invitationCode.replace("-", "");
  assert.equal(
    insertQuery.values[2],
    createHash("sha256").update(rawLinkToken).digest("hex"),
  );
  assert.equal(
    insertQuery.values[3],
    createHmac("sha256", CODE_SECRET).update(normalizedCode).digest("hex"),
  );
  assert.equal(insertQuery.values.includes(rawLinkToken), false);
  assert.equal(insertQuery.values.includes(invitation.invitationCode), false);

  const snapshot = insertQuery.values[4] as {
    recipe: Record<string, unknown>;
    originalOwner: Record<string, unknown>;
  };
  assert.deepEqual(snapshot, {
    recipe: {
      title: "김치찌개",
      description: "돼지고기를 넣은 김치찌개",
      servings: "2인분",
      cookingTimeMinutes: 30,
      ingredients: [
        {
          name: "김치",
          amount: "200",
          unit: "g",
          order: 1,
        },
      ],
      steps: [{ order: 1, description: "끓인다." }],
      source: null,
    },
    originalOwner: {
      name: "엄마",
      profileImageUrl: null,
    },
  });
  assert.equal("memo" in snapshot.recipe, false);
  assert.equal("ownerId" in snapshot.recipe, false);
});

test("타인·삭제·없는 레시피는 숨기고 소유한 비 OWNED 유형은 공유를 거부한다", async () => {
  const missingDatabase = createCreationPool(null);

  await assert.rejects(
    () =>
      createTransferInvitation(
        missingDatabase.pool,
        "firebase-user-id",
        "8fe1e897-bb99-4d8e-a59f-38de00c429bf",
        CODE_SECRET,
      ),
    (error) =>
      error instanceof TransferInvitationError &&
      error.code === "RECIPE_NOT_FOUND",
  );
  assert.equal(missingDatabase.queries.at(-1)?.sql, "ROLLBACK");

  for (const recipeType of ["EXTERNAL", "RECEIVED"] as const) {
    const database = createCreationPool(recipeType);

    await assert.rejects(
      () =>
        createTransferInvitation(
          database.pool,
          "firebase-user-id",
          "8fe1e897-bb99-4d8e-a59f-38de00c429bf",
          CODE_SECRET,
        ),
      (error) =>
        error instanceof TransferInvitationError &&
        error.code === "RECIPE_NOT_SHAREABLE",
    );
    assert.equal(database.queries.at(-1)?.sql, "ROLLBACK");
  }
});

test("링크와 코드는 같은 안전한 미리보기 계약을 해시 조회로 반환한다", async () => {
  const linkDatabase = createPreviewPool("ACTIVE");
  const codeDatabase = createPreviewPool("ACTIVE");
  const linkToken = "raw-link-token";
  const invitationCode = " abcd-2345 ";

  const byLink = await getTransferInvitationByLink(
    linkDatabase.pool,
    linkToken,
  );
  const byCode = await getTransferInvitationByCode(
    codeDatabase.pool,
    invitationCode,
    CODE_SECRET,
  );

  assert.deepEqual(byLink, byCode);
  assert.match(byLink.expiresAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(byLink, {
    invitationId: "invitation-id",
    recipe: {
      title: "김치찌개",
      description: null,
      servings: "2인분",
      cookingTimeMinutes: 30,
      ingredients: [],
      steps: [],
      source: null,
    },
    originalOwner: {
      name: "엄마",
      profileImageUrl: null,
    },
    expiresAt: byLink.expiresAt,
    canReshare: false,
  });
  assert.equal(
    linkDatabase.queries[0]?.values[0],
    createHash("sha256").update(linkToken).digest("hex"),
  );
  assert.equal(
    codeDatabase.queries[0]?.values[0],
    createHmac("sha256", CODE_SECRET).update("ABCD2345").digest("hex"),
  );
  assert.equal(linkDatabase.queries[0]?.values.includes(linkToken), false);
  assert.equal(
    codeDatabase.queries[0]?.values.includes(invitationCode),
    false,
  );
});

test("없는·사용·만료 초대를 링크와 코드에서 같은 오류로 구분한다", async () => {
  for (const [state, expectedCode] of [
    ["NOT_FOUND", "TRANSFER_INVITATION_NOT_FOUND"],
    ["USED", "TRANSFER_INVITATION_USED"],
    ["EXPIRED", "TRANSFER_INVITATION_EXPIRED"],
  ] as const) {
    const linkDatabase = createPreviewPool(state);
    const codeDatabase = createPreviewPool(state);

    for (const getPreview of [
      () => getTransferInvitationByLink(linkDatabase.pool, "secret-link"),
      () =>
        getTransferInvitationByCode(
          codeDatabase.pool,
          "SECR-ET23",
          CODE_SECRET,
        ),
    ]) {
      await assert.rejects(
        getPreview,
        (error) =>
          error instanceof TransferInvitationError &&
          error.code === expectedCode &&
          !error.message.includes("secret-link") &&
          !error.message.includes("SECR-ET23"),
      );
    }
  }
});

test("빈 코드를 연결 전에 거부하고 코드 해시 비밀값을 검증한다", async () => {
  const database = createPreviewPool("ACTIVE");

  await assert.rejects(
    () => getTransferInvitationByCode(database.pool, " - ", CODE_SECRET),
    (error) =>
      error instanceof TransferInvitationError &&
      error.code === "VALIDATION_ERROR",
  );
  assert.equal(database.queries.length, 0);

  const originalSecret = process.env.TRANSFER_INVITATION_CODE_SECRET;

  try {
    delete process.env.TRANSFER_INVITATION_CODE_SECRET;
    assert.throws(
      () => getTransferInvitationCodeSecret(),
      /TRANSFER_INVITATION_CODE_SECRET/,
    );

    process.env.TRANSFER_INVITATION_CODE_SECRET = "short";
    assert.throws(
      () => getTransferInvitationCodeSecret(),
      /TRANSFER_INVITATION_CODE_SECRET/,
    );

    process.env.TRANSFER_INVITATION_CODE_SECRET = CODE_SECRET;
    assert.equal(getTransferInvitationCodeSecret(), CODE_SECRET);
  } finally {
    if (originalSecret === undefined) {
      delete process.env.TRANSFER_INVITATION_CODE_SECRET;
    } else {
      process.env.TRANSFER_INVITATION_CODE_SECRET = originalSecret;
    }
  }
});

test("초대를 잠그고 RECEIVED 레시피·관계 정보·사용 완료를 함께 커밋한다", async () => {
  const database = createAcceptancePool("ACTIVE");

  const result = await acceptTransferInvitation(
    database.pool,
    recipient,
    "11111111-1111-4111-8111-111111111111",
    {
      senderDisplayName: "  엄마  ",
      relationshipLabel: "  엄마의 레시피  ",
      memo: "  주말에 만들어 보기  ",
    },
  );

  assert.match(result.recipeId, /^[0-9a-f-]{36}$/);
  assert.equal(result.type, "RECEIVED");
  assert.equal(database.connectCount, 1);
  assert.equal(database.releaseCount, 1);
  assert.equal(database.queries[0]?.sql, "BEGIN");
  assert.equal(database.queries.at(-1)?.sql, "COMMIT");

  const invitationQuery = database.queries.find(({ sql }) =>
    sql.includes("FROM transfer_invitations"),
  );
  assert.match(
    invitationQuery?.sql ?? "",
    /FOR UPDATE OF transfer_invitations/,
  );

  const recipeQuery = database.queries.find(({ sql }) =>
    sql.includes("INSERT INTO recipes"),
  );
  assert.deepEqual(recipeQuery?.values.slice(1), [
    "recipient-id",
    "RECEIVED",
    "김치찌개",
    "돼지고기를 넣은 김치찌개",
    "2인분",
    30,
    "주말에 만들어 보기",
  ]);

  const ingredientQuery = database.queries.find(({ sql }) =>
    sql.includes("INSERT INTO ingredients"),
  );
  const stepQuery = database.queries.find(({ sql }) =>
    sql.includes("INSERT INTO recipe_steps"),
  );
  const sourceQuery = database.queries.find(({ sql }) =>
    sql.includes("INSERT INTO recipe_sources"),
  );
  assert.deepEqual(ingredientQuery?.values.slice(1), [
    1,
    "김치",
    "200",
    "g",
  ]);
  assert.deepEqual(stepQuery?.values.slice(1), [1, "끓인다."]);
  assert.deepEqual(sourceQuery?.values.slice(1), [
    "https://example.com/kimchi",
    "김치찌개",
    "엄마",
  ]);

  const detailQuery = database.queries.find(({ sql }) =>
    sql.includes("INSERT INTO received_recipe_details"),
  );
  assert.deepEqual(detailQuery?.values, [
    result.recipeId,
    "11111111-1111-4111-8111-111111111111",
    "original-owner-id",
    "엄마",
    null,
    "엄마",
    "엄마의 레시피",
  ]);
  assert.match(
    database.queries.find(({ sql }) =>
      sql.includes("UPDATE transfer_invitations"),
    )?.sql ?? "",
    /used_at = CURRENT_TIMESTAMP/,
  );
});

test("잘못된 수락 입력과 ID를 연결 전에 거부하고 공백 메모를 null로 정규화한다", async () => {
  for (const [invitationId, request] of [
    [
      "not-an-id",
      {
        senderDisplayName: "엄마",
        relationshipLabel: "가족",
        memo: null,
      },
    ],
    [
      "11111111-1111-4111-8111-111111111111",
      {
        senderDisplayName: " ",
        relationshipLabel: "가족",
        memo: null,
      },
    ],
    [
      "11111111-1111-4111-8111-111111111111",
      {
        senderDisplayName: "엄마",
        relationshipLabel: " ",
        memo: null,
      },
    ],
    [
      "11111111-1111-4111-8111-111111111111",
      {
        senderDisplayName: "엄마",
        relationshipLabel: "가족",
        memo: null,
        forged: true,
      },
    ],
  ] as const) {
    const database = createAcceptancePool("ACTIVE");

    await assert.rejects(
      () =>
        acceptTransferInvitation(
          database.pool,
          recipient,
          invitationId,
          request,
        ),
      (error) =>
        error instanceof TransferInvitationError &&
        (error.code === "VALIDATION_ERROR" ||
          error.code === "TRANSFER_INVITATION_NOT_FOUND"),
    );
    assert.equal(database.connectCount, 0);
  }

  const database = createAcceptancePool("ACTIVE");
  const result = await acceptTransferInvitation(
    database.pool,
    recipient,
    "11111111-1111-4111-8111-111111111111",
    {
      senderDisplayName: "엄마",
      relationshipLabel: "가족",
      memo: "   ",
    },
  );
  const recipeQuery = database.queries.find(({ sql }) =>
    sql.includes("INSERT INTO recipes"),
  );
  assert.equal(recipeQuery?.values[7], null);
  assert.equal(result.type, "RECEIVED");
});

test("없는·사용·만료·자기 초대를 저장 없이 롤백한다", async () => {
  for (const [state, expectedCode] of [
    ["NOT_FOUND", "TRANSFER_INVITATION_NOT_FOUND"],
    ["USED", "TRANSFER_INVITATION_USED"],
    ["EXPIRED", "TRANSFER_INVITATION_EXPIRED"],
    ["SELF", "TRANSFER_INVITATION_SELF_ACCEPT_NOT_ALLOWED"],
  ] as const) {
    const database = createAcceptancePool(state);

    await assert.rejects(
      () =>
        acceptTransferInvitation(
          database.pool,
          recipient,
          "11111111-1111-4111-8111-111111111111",
          {
            senderDisplayName: "엄마",
            relationshipLabel: "가족",
            memo: null,
          },
        ),
      (error) =>
        error instanceof TransferInvitationError &&
        error.code === expectedCode,
    );
    assert.equal(database.queries.at(-1)?.sql, "ROLLBACK");
    assert.equal(
      database.queries.some(({ sql }) => sql.includes("INSERT INTO recipes")),
      false,
    );
    assert.equal(database.releaseCount, 1);
  }
});

test("수락 저장 중 실패하면 초대와 레시피 변경을 함께 롤백한다", async () => {
  const database = createAcceptancePool(
    "ACTIVE",
    "INSERT INTO received_recipe_details",
  );

  await assert.rejects(
    () =>
      acceptTransferInvitation(
        database.pool,
        recipient,
        "11111111-1111-4111-8111-111111111111",
        {
          senderDisplayName: "엄마",
          relationshipLabel: "가족",
          memo: null,
        },
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
