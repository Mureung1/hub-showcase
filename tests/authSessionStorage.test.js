import assert from "node:assert/strict";
import test from "node:test";

import {
  createPersistentAuthStorageAdapter,
  getPersistentAuthStorage,
} from "../src/auth/sessionStorage.js";

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

test("인증 세션은 브라우저 localStorage에 저장해 창을 닫은 뒤에도 복원할 수 있다", () => {
  const browserStorage = createFakeStorage();
  const storage = getPersistentAuthStorage(browserStorage);

  storage.setItem("supabase-session", "token");

  assert.equal(browserStorage.values.get("supabase-session"), "token");
  assert.equal(storage.getItem("supabase-session"), "token");
});

test("localStorage가 없거나 차단되면 현재 페이지의 메모리 저장소를 사용한다", () => {
  for (const browserStorage of [null, createFakeStorage({ shouldThrow: true })]) {
    const storage = createPersistentAuthStorageAdapter(browserStorage);
    storage.setItem("supabase-session", "token");
    assert.equal(storage.getItem("supabase-session"), "token");

    storage.removeItem("supabase-session");
    assert.equal(storage.getItem("supabase-session"), null);
  }
});
