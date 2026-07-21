import assert from "node:assert/strict";
import test from "node:test";

import { toFriendlyAuthError } from "../src/auth/authErrorMessages.js";

test("Supabase 인증 오류를 사용자가 조치할 수 있는 메시지로 변환한다", () => {
  assert.equal(
    toFriendlyAuthError({ message: "Email rate limit exceeded", code: "over_email_send_rate_limit" }),
    "가입 또는 로그인 요청 제한에 도달했습니다. 잠시 후 다시 시도해 주세요.",
  );
  assert.equal(
    toFriendlyAuthError({ message: "Invalid API key" }),
    "Supabase 공개 키 설정을 확인해 주세요. service_role 키는 사용할 수 없습니다.",
  );
  assert.equal(
    toFriendlyAuthError({ code: "email_address_invalid" }),
    "아이디 인증 식별자 형식이 올바르지 않습니다. 새로고침 후 다시 시도해 주세요.",
  );
  assert.equal(
    toFriendlyAuthError({ message: "Password should be at least 6 characters" }),
    "비밀번호는 6자 이상으로 입력해 주세요.",
  );
});