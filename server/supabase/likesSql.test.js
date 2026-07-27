import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const likesSqlUrl = new URL("./likes.sql", import.meta.url);

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
});
