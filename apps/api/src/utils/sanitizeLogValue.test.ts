import { describe, expect, it } from "vitest";
import { redactRequestPath, sanitizeLogValue } from "./sanitizeLogValue.js";

describe("sanitizeLogValue", () => {
  it("중첩 객체의 비밀번호, 전화번호, 토큰 값을 가린다", () => {
    expect(
      sanitizeLogValue({
        password: "PatientDev123!",
        profile: {
          phoneNumber: "+821012345678",
          lookupToken: "onsite-status-secret-token",
        },
      }),
    ).toEqual({
      password: "[REDACTED]",
      profile: {
        phoneNumber: "[REDACTED]",
        lookupToken: "[REDACTED]",
      },
    });
  });

  it("오류 메시지의 데이터베이스 비밀번호와 전화번호를 가린다", () => {
    const result = sanitizeLogValue(
      new Error(
        "connect postgresql://postgres:secret-password@db.example.com:5432/postgres for 010-1234-5678",
      ),
    );

    expect(result).toMatchObject({
      name: "Error",
      message:
        "connect postgresql://postgres:[REDACTED]@db.example.com:5432/postgres for [REDACTED]",
    });
  });
});

describe("redactRequestPath", () => {
  it("현장 조회 URL의 조회 토큰을 가린다", () => {
    expect(redactRequestPath("/api/onsite-status/secret-token-value")).toBe(
      "/api/onsite-status/[REDACTED]",
    );
  });
});
