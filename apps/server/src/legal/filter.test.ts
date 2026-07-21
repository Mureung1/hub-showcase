import { describe, it, expect } from "vitest";
import {
  filterConsented,
  buildAdMessage,
  isNightHour,
  planAdSend,
  OPT_OUT_NUMBER,
  type Recipient,
} from "./filter";
import { stripEmoji, buildSmsBody } from "shared";

function rc(over: Partial<Recipient> = {}): Recipient {
  return {
    id: "c1",
    phone: "010-0000-0001",
    consent_at: "2026-05-01T00:00:00Z",
    opt_out_at: null,
    ...over,
  };
}

describe("isNightHour (야간 경계값)", () => {
  it("20:59 허용 · 21:00 차단 · 07:59 차단 · 08:00 허용", () => {
    expect(isNightHour(20)).toBe(false); // 20:59 허용
    expect(isNightHour(21)).toBe(true); //  21:00 차단
    expect(isNightHour(7)).toBe(true); //   07:59 차단
    expect(isNightHour(8)).toBe(false); //  08:00 허용
  });
  it("자정 차단 · 정오 허용", () => {
    expect(isNightHour(0)).toBe(true);
    expect(isNightHour(12)).toBe(false);
  });
});

describe("filterConsented (수신동의 필터)", () => {
  it("동의·미거부·번호 있는 대상만 남긴다", () => {
    const list = [
      rc({ id: "a" }), //                                     통과
      rc({ id: "b", consent_at: null }), //                   미동의 제외
      rc({ id: "c", opt_out_at: "2026-06-01T00:00:00Z" }), // 수신거부 제외
      rc({ id: "d", phone: null }), //                        번호 없음 제외
    ];
    expect(filterConsented(list).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("buildAdMessage", () => {
  it("(광고)·전송자명·무료수신거부를 삽입한다", () => {
    const msg = buildAdMessage("오늘 픽업 10% 할인", "김사장 카페");
    expect(msg.startsWith("(광고) [김사장 카페]")).toBe(true);
    expect(msg).toContain("오늘 픽업 10% 할인");
    expect(msg).toContain(`무료수신거부 ${OPT_OUT_NUMBER}`);
  });
});

describe("planAdSend", () => {
  const base = {
    copy: "오늘 픽업 10% 할인",
    storeName: "김사장 카페",
    recipients: [rc({ id: "a" }), rc({ id: "b", consent_at: null })],
  };
  it("주간이면 send + 미동의 제외 + (광고) 삽입", () => {
    const plan = planAdSend({ ...base, assumeNight: false });
    expect(plan.action).toBe("send");
    expect(plan.recipients.map((r) => r.id)).toEqual(["a"]);
    expect(plan.body).toContain("(광고)");
  });
  it("야간이면 schedule로 전환(대상은 그대로 필터)", () => {
    const plan = planAdSend({ ...base, assumeNight: true });
    expect(plan.action).toBe("schedule");
    expect(plan.recipients.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("stripEmoji (문자용 이모지 제거 · QW-3)", () => {
  it("이모지를 제거하고 텍스트·공백은 정리한다", () => {
    expect(stripEmoji("따뜻한 아메리카노 ☕ 픽업 🎉")).toBe("따뜻한 아메리카노 픽업");
  });
  it("이모지만 있던 줄로 생긴 과도한 빈 줄을 줄인다", () => {
    expect(stripEmoji("첫 줄 ☕\n\n\n\n둘째 줄")).toBe("첫 줄\n\n둘째 줄");
  });
});

describe("buildSmsBody (문자 본문 = 발송 미리보기 · QW-2·3)", () => {
  const body = buildSmsBody({ copy: "오늘 픽업 10% 할인 ☔", storeName: "김사장 카페" });
  it("(광고)·전송자명으로 시작한다", () => {
    expect(body.startsWith("(광고) [김사장 카페]")).toBe(true);
  });
  it("문자 경로에서 이모지가 제거된다(LMS EUC-KR 대응)", () => {
    expect(body).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(body).toContain("오늘 픽업 10% 할인");
  });
  it("무료수신거부 앞에 빈 줄(2줄)이 있다 · QW-2", () => {
    expect(body).toContain(`\n\n\n무료수신거부 ${OPT_OUT_NUMBER}`);
  });
});
