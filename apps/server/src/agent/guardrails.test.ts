import { describe, it, expect } from "vitest";
import type { Proposal } from "shared";
import { checkGuardrails, lmsByteLength } from "./guardrails";

function proposal(over: Partial<Proposal> = {}): Proposal {
  return {
    title: "오늘의 픽업 혜택",
    copy: "☕ 오늘 픽업 주문 10% 할인이에요!",
    promo: { type: "할인", value: "픽업 10% 할인" },
    channels: ["dangol"],
    ...over,
  };
}

describe("lmsByteLength", () => {
  it("한글 2byte, ASCII 1byte로 근사한다", () => {
    expect(lmsByteLength("abc")).toBe(3);
    expect(lmsByteLength("가나")).toBe(4);
    expect(lmsByteLength("a가")).toBe(3);
  });
});

describe("checkGuardrails", () => {
  it("정상 제안은 통과한다", () => {
    expect(checkGuardrails(proposal()).ok).toBe(true);
  });

  it("할인율 20%는 허용, 21%는 거부한다 (경계값)", () => {
    expect(checkGuardrails(proposal({ promo: { type: "할인", value: "20% 할인" } })).ok).toBe(true);
    const bad = checkGuardrails(proposal({ promo: { type: "할인", value: "21% 할인" } }));
    expect(bad.ok).toBe(false);
    expect(bad.violations[0]).toMatch(/할인율 21%/);
  });

  it("copy에 든 큰 할인율도 잡는다", () => {
    expect(checkGuardrails(proposal({ copy: "오늘만 30% 할인!" })).ok).toBe(false);
  });

  it("금칙어(의료·과장)를 검출한다", () => {
    expect(checkGuardrails(proposal({ copy: "피로 완치 효과!" })).ok).toBe(false);
    expect(checkGuardrails(proposal({ title: "동네 최고 카페" })).ok).toBe(false);
  });

  it("LMS 2,000byte를 초과하면 거부한다", () => {
    const long = "가".repeat(1001); // 2002 byte
    expect(checkGuardrails(proposal({ copy: long })).ok).toBe(false);
  });
});
