import { describe, it, expect } from "vitest";
import { getMicrotask } from "./microtask.js";
import {
  MICROTASK_TEMPLATES,
  CUSTOM_FALLBACK_MICROTASKS,
  REASON_KEYS,
} from "./microtaskTemplates.js";
import { TYPE_OPTIONS } from "./taskOptions.js";

describe("getMicrotask", () => {
  it("등록된 type/reason 조합이면 해당 템플릿 목록 중 하나를 반환한다 (happy path)", () => {
    const result = getMicrotask({ type: "개인공부", reason: "overwhelm" });
    expect(MICROTASK_TEMPLATES["개인공부"].overwhelm).toContain(result);
  });

  it("등록되지 않은 type이면 커스텀 폴백으로 떨어진다 (경계)", () => {
    const result = getMicrotask({ type: "존재하지않는유형", reason: "overwhelm" });
    expect(CUSTOM_FALLBACK_MICROTASKS).toContain(result);
  });

  it("reason이 custom이면 type과 무관하게 커스텀 폴백을 반환한다 (경계)", () => {
    const result = getMicrotask({ type: "개인공부", reason: "custom" });
    expect(CUSTOM_FALLBACK_MICROTASKS).toContain(result);
  });

  it("type/reason이 빈 문자열이어도 커스텀 폴백을 반환한다 (경계)", () => {
    const result = getMicrotask({ type: "", reason: "" });
    expect(CUSTOM_FALLBACK_MICROTASKS).toContain(result);
  });

  it("등록된 모든 type x reason 조합에서 항상 비어있지 않은 문자열을 반환한다 (회귀)", () => {
    for (const type of TYPE_OPTIONS) {
      for (const reason of REASON_KEYS) {
        const result = getMicrotask({ type, reason });
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      }
    }
  });

  it("커스텀 폴백 자체도 항상 비어있지 않은 문자열만 담고 있다 (회귀)", () => {
    for (const text of CUSTOM_FALLBACK_MICROTASKS) {
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
