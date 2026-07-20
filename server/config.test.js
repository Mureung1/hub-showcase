import assert from "node:assert/strict";
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
