import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { readSupabaseConfig } from "./config.js";

test("Given valid server variables, when config is read, then both values are returned", () => {
  const config = readSupabaseConfig({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  });

  assert.deepEqual(config, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-service-role-key",
  });
});

test("Given missing server variables, when config is read, then startup is rejected", () => {
  assert.throws(
    () => readSupabaseConfig({}),
    /SUPABASE_URL.*SUPABASE_SERVICE_ROLE_KEY/,
  );
});

test("Given the server entrypoint, when it starts, then it listens once without temporary debug output", () => {
  const source = readFileSync(new URL("./demo.js", import.meta.url), "utf8");

  assert.equal(source.match(/app\.listen\(/g)?.length, 1);
  assert.doesNotMatch(source, /수정된 서버 실행|===== Supabase Error =====/);
});
