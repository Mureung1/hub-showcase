import assert from "node:assert/strict";
import test from "node:test";

import { clearLegacyLocalAuthSession, createSessionStorageAdapter } from "../src/auth/sessionStorage.js";

function createFakeStorage({ shouldThrow = false } = {}) {
  const values = new Map();

  return {
    getItem(key) {
      if (shouldThrow) throw new Error("storage blocked");
      return values.get(key) ?? null;
    },
    removeItem(key) {
      if (shouldThrow) throw new Error("storage blocked");
      values.delete(key);
    },
    setItem(key, value) {
      if (shouldThrow) throw new Error("storage blocked");
      values.set(key, String(value));
    },
    values,
  };
}

test("인증 세션은 브라우저 sessionStorage에 저장된다", () => {
  const browserStorage = createFakeStorage();
  const storage = createSessionStorageAdapter(browserStorage);

  storage.setItem("supabase-session", "token");

  assert.equal(browserStorage.values.get("supabase-session"), "token");
  assert.equal(storage.getItem("supabase-session"), "token");
});

test("sessionStorage가 없거나 차단되면 현재 페이지의 메모리 저장소를 사용한다", () => {
  for (const browserStorage of [null, createFakeStorage({ shouldThrow: true })]) {
    const storage = createSessionStorageAdapter(browserStorage);
    storage.setItem("supabase-session", "token");
    assert.equal(storage.getItem("supabase-session"), "token");

    storage.removeItem("supabase-session");
    assert.equal(storage.getItem("supabase-session"), null);
  }
});
test("이전 localStorage Supabase 세션 키를 제거한다", () => {
  const localStorage = createFakeStorage();
  localStorage.setItem("sb-project-ref-auth-token", "old-token");

  clearLegacyLocalAuthSession("https://project-ref.supabase.co", localStorage);

  assert.equal(localStorage.getItem("sb-project-ref-auth-token"), null);
});
