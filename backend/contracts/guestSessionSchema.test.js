import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("guest session database contract", () => {
  it("stores only a key hash and scopes records by guest session", async () => {
    const migration = await readFile(
      resolve(
        process.cwd(),
        "backend/migrations/20260729_add_guest_sessions.sql"
      ),
      "utf8"
    );

    expect(migration).toContain("key_hash text not null unique");
    expect(migration).not.toMatch(/\brecovery_key\b/);
    expect(migration).toContain("guest_session_id uuid not null");
    expect(migration).toContain("on delete cascade");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all");
  });
});
