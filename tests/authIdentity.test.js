import assert from "node:assert/strict";
import test from "node:test";

import { getUsernameFromUser, normalizeUsername, usernameToAuthEmail } from "../src/auth/authIdentity.js";

test("아이디를 소문자로 정규화해 내부 인증 식별자로 변환한다", () => {
  assert.equal(normalizeUsername("  Uni.Radar-01 "), "uni.radar-01");
  assert.equal(usernameToAuthEmail("Uni.Radar-01"), "uni.radar-01@uniradar-login.app");
  assert.equal(getUsernameFromUser({ user_metadata: { username: "Uni.Radar-01" } }), "uni.radar-01");
});

test("허용되지 않은 아이디 형식은 인증 요청 전에 거부한다", () => {
  assert.throws(() => usernameToAuthEmail("ab"), /아이디는/);
  assert.throws(() => usernameToAuthEmail("uni radar"), /아이디는/);
  assert.throws(() => usernameToAuthEmail("user@example.com"), /아이디는/);
});