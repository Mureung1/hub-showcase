import { describe, it, expect } from "vitest";
import { sendSms, SMS_LIVE } from "./solapi";

describe("sendSms (dry-run)", () => {
  it("SOLAPI 키가 없으면 dry-run으로 동작한다 (실발송 안 함)", async () => {
    // 테스트 env엔 SOLAPI 키가 없다 → 항상 dry-run
    expect(SMS_LIVE).toBe(false);
    const r = await sendSms("01000000000", "테스트 문자");
    expect(r.ok).toBe(true);
    expect(r.live).toBe(false);
    expect(r.messageId).toMatch(/^dry-/);
  });
});
