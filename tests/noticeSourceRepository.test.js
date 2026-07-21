import assert from "node:assert/strict";
import test from "node:test";

import { createNoticeSourceRepository } from "../server/services/noticeSourceRepository.js";

function createSourceClient() {
  const rows = [];

  return {
    from(table) {
      assert.equal(table, "notice_sources");
      return {
        select() {
          return {
            eq(_column, userId) {
              return {
                async order() {
                  return { data: rows.filter((row) => row.user_id === userId), error: null };
                },
              };
            },
          };
        },
        upsert(nextRow) {
          const existingIndex = rows.findIndex((row) => row.user_id === nextRow.user_id && row.target_url === nextRow.target_url);
          const row = {
            id: existingIndex >= 0 ? rows[existingIndex].id : `source-${rows.length + 1}`,
            created_at: "2026-07-21T00:00:00.000Z",
            updated_at: "2026-07-21T00:00:00.000Z",
            ...nextRow,
          };
          if (existingIndex >= 0) rows[existingIndex] = row;
          else rows.push(row);
          return {
            select() {
              return {
                async single() {
                  return { data: row, error: null };
                },
              };
            },
          };
        },
        delete() {
          return {
            eq(_column, sourceId) {
              return {
                async eq(_userColumn, userId) {
                  const index = rows.findIndex((row) => row.id === sourceId && row.user_id === userId);
                  if (index >= 0) rows.splice(index, 1);
                  return { error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

const source = {
  category: "직접 추가",
  html: "",
  linkSelector: "a[href]",
  name: "경북대학교 공지",
  sourceMode: "live",
  targetUrl: "https://www.knu.ac.kr/notices",
};

test("저장 출처는 사용자별로 분리되고 같은 URL은 해당 사용자 안에서 갱신된다", async () => {
  const repository = createNoticeSourceRepository({ createUserClient: () => createSourceClient() });
  const client = createSourceClient();
  const sharedRepository = createNoticeSourceRepository({ createUserClient: () => client });

  const accountASource = await sharedRepository.upsertSource({ accessToken: "token-a", userId: "account-a", source });
  await sharedRepository.upsertSource({ accessToken: "token-b", userId: "account-b", source: { ...source, name: "다른 계정 공지" } });
  await sharedRepository.upsertSource({ accessToken: "token-a", userId: "account-a", source: { ...source, name: "경북대학교 새 공지" } });

  const accountASources = await sharedRepository.listSources({ accessToken: "token-a", userId: "account-a" });
  const accountBSources = await sharedRepository.listSources({ accessToken: "token-b", userId: "account-b" });

  assert.equal(accountASources.length, 1);
  assert.equal(accountASources[0].name, "경북대학교 새 공지");
  assert.equal(accountBSources.length, 1);
  assert.equal(accountBSources[0].name, "다른 계정 공지");

  await sharedRepository.deleteSource({ accessToken: "token-a", userId: "account-a", sourceId: accountASource.id.replace("custom:", "") });
  assert.equal((await sharedRepository.listSources({ accessToken: "token-a", userId: "account-a" })).length, 0);
  assert.equal((await sharedRepository.listSources({ accessToken: "token-b", userId: "account-b" })).length, 1);
  assert.ok(repository);
});
test("출처 테이블이 없으면 마이그레이션 실행 안내를 반환한다", async () => {
  const repository = createNoticeSourceRepository({
    createUserClient: () => ({
      from() {
        return {
          upsert() {
            return {
              select() {
                return {
                  async single() {
                    return { data: null, error: { code: "42P01" } };
                  },
                };
              },
            };
          },
        };
      },
    }),
  });

  await assert.rejects(
    repository.upsertSource({ accessToken: "token-a", userId: "account-a", source }),
    (error) => error.code === "notice_source_schema_missing" && error.message.includes("20260721_notice_sources.sql"),
  );
});