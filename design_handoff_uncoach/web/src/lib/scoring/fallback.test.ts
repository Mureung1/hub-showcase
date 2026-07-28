import { describe, it, expect } from "vitest";
import { demoScore, demoSummary, curatedNews, situationFromInput } from "./fallback";
import { isUnavailable } from "./gemini";
import type { Situation } from "../domain/types";

const sit = { id: "x", medium: "chat", title: "t" } as unknown as Situation;

describe("fallback", () => {
  it("demoScore는 demo:true·유효 점수·total을 낸다", () => {
    const r = demoScore({ situation: sit, draft: "안녕하세요 확인 부탁드려요" });
    expect(r.demo).toBe(true);
    expect(r.total).toBeGreaterThan(0);
    for (const k of ["context", "register", "strategy"] as const) {
      expect(r.scores[k]).toBeGreaterThanOrEqual(1);
      expect(r.scores[k]).toBeLessThanOrEqual(3);
    }
  });

  it("demoSummary는 복붙이면 grasp/concision을 1로 깎는다(오프라인에서도 탐지)", () => {
    const passage = { text: "정부는 오늘 새 정책을 발표했다 이번 조치로 시장은 크게 반응했다", keyPoints: ["a", "b"] };
    const copied = demoSummary(passage, passage.text); // 그대로 베낌
    expect(copied.demo).toBe(true);
    expect(copied.scores.grasp).toBe(1);
    expect(copied.scores.concision).toBe(1);

    const own = demoSummary(passage, "정부 새 정책에 시장이 반응했다");
    expect(own.scores.grasp).toBe(2);
  });

  it("curatedNews는 알 수 없는 카테고리도 유효 지문으로 폴백한다", () => {
    const p = curatedNews("nope");
    expect(p.text.length).toBeGreaterThan(0);
    expect(p.keyPoints.length).toBeGreaterThan(0);
  });

  it("situationFromInput은 입력만으로 루브릭 3축을 채운다", () => {
    const s = situationFromInput({ title: "팀장에게 일정 변경 부탁", who: "팀장" });
    expect(s.rubric?.context).toHaveLength(3);
    expect(s.rel).toBe("팀장");
  });

  it("isUnavailable은 unavailable 플래그를 읽는다", () => {
    const e = Object.assign(new Error("NO_KEY"), { unavailable: true });
    expect(isUnavailable(e)).toBe(true);
    expect(isUnavailable(new Error("기타"))).toBe(false);
  });
});
