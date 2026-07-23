import { describe, it, expect } from "vitest";
import { sanitizeBlob } from "./blob";

// SDD: 아래 스펙대로 먼저 테스트를 고정한다.
// sanitizeBlob(raw): 신뢰불가 입력 → 항상 { profile, history, assets, customSits } 유효 blob.
describe("sanitizeBlob", () => {
  it("정상 blob은 그대로 통과", () => {
    const good = {
      profile: { role: "학생" },
      history: [{ d: "7.23", sid: "pq", scores: { context: 3, register: 3, strategy: 3 } }],
      assets: [{ id: "a1", text: "t", sid: "pq", date: "7.23" }],
      customSits: [],
    };
    expect(sanitizeBlob(good)).toEqual(good);
  });

  it("배열 자리에 배열이 아니면 빈 배열로 대체", () => {
    const out = sanitizeBlob({ history: "해킹", assets: 42, customSits: null });
    expect(out.history).toEqual([]);
    expect(out.assets).toEqual([]);
    expect(out.customSits).toEqual([]);
  });

  it("profile이 객체가 아니면 null", () => {
    expect(sanitizeBlob({ profile: "x" }).profile).toBeNull();
    expect(sanitizeBlob({ profile: [1, 2] }).profile).toBeNull();
    expect(sanitizeBlob({ profile: 3 }).profile).toBeNull();
  });

  it("profile이 객체면 유지", () => {
    expect(sanitizeBlob({ profile: { role: "직장인" } }).profile).toEqual({ role: "직장인" });
  });

  it("누락 필드는 기본값(빈 배열·null)", () => {
    expect(sanitizeBlob({})).toEqual({ profile: null, history: [], assets: [], customSits: [] });
  });

  it("입력 자체가 null/undefined/비객체여도 빈 blob", () => {
    const empty = { profile: null, history: [], assets: [], customSits: [] };
    expect(sanitizeBlob(null)).toEqual(empty);
    expect(sanitizeBlob(undefined)).toEqual(empty);
    expect(sanitizeBlob("문자열")).toEqual(empty);
  });

  it("알 수 없는 추가 키는 버림", () => {
    const out = sanitizeBlob({ evil: "drop me", history: [] }) as unknown as Record<string, unknown>;
    expect(out.evil).toBeUndefined();
    expect(Object.keys(out).sort()).toEqual(["assets", "customSits", "history", "profile"]);
  });
});
