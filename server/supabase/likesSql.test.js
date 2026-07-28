import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const likesSqlUrl = new URL("./likes.sql", import.meta.url);
const musicRecordsSqlUrl = new URL("./music_records.sql", import.meta.url);

describe("likes SQL", () => {
  it("keeps direct RPC page sizes between 1 and 21, including null", async () => {
    const sql = await readFile(likesSqlUrl, "utf8");

    assert.match(
      sql,
      /limit\s+least\(greatest\(coalesce\(p_limit,\s*21\),\s*1\),\s*21\)/i,
    );

    const normalizeLimit = (limit) => Math.min(Math.max(limit ?? 21, 1), 21);
    assert.deepEqual(
      [null, 0, -1, 1_000, undefined].map(normalizeLimit),
      [21, 1, 1, 21, 21],
    );
  });

  it("allows authenticated public diary reads without opening anonymous access", async () => {
    const [likesSql, musicRecordsSql] = await Promise.all([
      readFile(likesSqlUrl, "utf8"),
      readFile(musicRecordsSqlUrl, "utf8"),
    ]);

    assert.match(
      musicRecordsSql,
      /create policy "authenticated_users_can_read_records"[\s\S]*?to authenticated[\s\S]*?using \(\(select auth\.uid\(\)\) is not null\)/i,
    );
    assert.match(
      musicRecordsSql,
      /create policy "authenticated_users_can_create_owned_records"[\s\S]*?auth\.uid\(\) = user_id/i,
    );
    assert.match(
      musicRecordsSql,
      /group by user_id,\s*record_date[\s\S]*?having count\(\*\) > 1/i,
    );
    assert.match(
      musicRecordsSql,
      /create unique index if not exists music_records_user_id_record_date_unique[\s\S]*?\(user_id,\s*record_date\)/i,
    );
    assert.equal(
      (likesSql.match(/and \(select auth\.uid\(\)\) is not null/g) ?? []).length,
      2,
    );
    assert.match(likesSql, /from anon;/i);
    assert.match(likesSql, /to authenticated;/i);
  });
});
