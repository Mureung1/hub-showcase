import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

const sqlUrl = new URL("./spotify_connections.sql", import.meta.url);

describe("Spotify connection SQL", () => {
  it("keeps OAuth state and encrypted tokens server-only", async () => {
    const sql = (await readFile(sqlUrl, "utf8")).toLowerCase();

    assert.match(sql, /alter table public\.spotify_oauth_states enable row level security/);
    assert.match(sql, /alter table public\.spotify_connections enable row level security/);
    assert.match(
      sql,
      /revoke all on table public\.spotify_oauth_states from public, anon, authenticated/,
    );
    assert.match(
      sql,
      /revoke all on table public\.spotify_connections from public, anon, authenticated/,
    );
    assert.doesNotMatch(sql, /create policy/);
    assert.match(sql, /access_token_encrypted text not null/);
    assert.match(sql, /refresh_token_encrypted text not null/);
    assert.match(sql, /primary key \(user_id, recap_year, recap_month\)/);
    assert.match(sql, /alter table public\.spotify_playlist_exports enable row level security/);
    assert.match(
      sql,
      /revoke all on table public\.spotify_playlist_exports from public, anon, authenticated/,
    );
    assert.match(sql, /status in \('creating', 'completed', 'failed'\)/);
    assert.match(sql, /updated_at timestamptz not null default now\(\)/);
  });
});
