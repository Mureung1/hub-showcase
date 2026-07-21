import { describe, it, expect } from "vitest";
import { totalOf, personaOf, getSituation, splitBubbles, SITUATIONS } from "./situations";
import type { Situation } from "./types";

describe("totalOf", () => {
  it("모든 축 3점이면 100점", () => {
    expect(totalOf({ context: 3, register: 3, strategy: 3 })).toBe(100);
  });
  it("모든 축 1점이면 33점(가중 합)", () => {
    expect(totalOf({ context: 1, register: 1, strategy: 1 })).toBe(33);
  });
  it("context 가중치가 가장 큼(40)", () => {
    const onlyContext = totalOf({ context: 3, register: 1, strategy: 1 });
    const onlyRegister = totalOf({ context: 1, register: 3, strategy: 1 });
    expect(onlyContext).toBeGreaterThan(onlyRegister);
  });
});

describe("splitBubbles", () => {
  it("세 문장이면 세 말풍선", () => {
    expect(splitBubbles("안녕하세요. 확인 부탁드립니다. 감사합니다.")).toHaveLength(3);
  });
  it("한 문장이면 하나", () => {
    expect(splitBubbles("안녕하세요")).toHaveLength(1);
  });
  it("최대 3개로 제한", () => {
    const r = splitBubbles("하나. 둘. 셋. 넷. 다섯.");
    expect(r.length).toBeLessThanOrEqual(3);
  });
  it("빈 문자열은 빈 배열", () => {
    expect(splitBubbles("")).toEqual([]);
  });
});

describe("personaOf", () => {
  it("항상 emoji·name·color를 가진 객체", () => {
    const p = personaOf({ rel: "직속 상사" });
    expect(typeof p.emoji).toBe("string");
    expect(p.emoji.length).toBeGreaterThan(0);
    expect(typeof p.name).toBe("string");
    expect(typeof p.color).toBe("string");
  });
  it("교수 관계는 교수 이름을 반영", () => {
    const p = personaOf({ rel: "지도교수" });
    expect(p.name).toContain("교수");
  });
});

describe("getSituation", () => {
  it("내장 상황 id로 조회", () => {
    const s = getSituation("pq");
    expect(s).toBeDefined();
    expect(s?.id).toBe("pq");
  });
  it("없는 id는 undefined", () => {
    expect(getSituation("__nope__")).toBeUndefined();
  });
  it("커스텀 상황도 조회", () => {
    const custom: Situation = {
      id: "c123",
      roles: [],
      title: "테스트",
      rel: "상대",
      counterpart: "c",
      goal: "g",
      tension: "t",
      axis: "① 맥락",
      rubric: { context: ["1", "2", "3"], register: ["1", "2", "3"], strategy: ["1", "2", "3"] },
    };
    expect(getSituation("c123", [custom])?.title).toBe("테스트");
  });
});

describe("SITUATIONS 데이터 무결성", () => {
  it("61개 이상, 모든 상황에 id·title·rubric(3×3)", () => {
    expect(SITUATIONS.length).toBeGreaterThanOrEqual(61);
    for (const s of SITUATIONS) {
      expect(s.id).toBeTruthy();
      expect(s.title).toBeTruthy();
      expect(s.rubric).toBeDefined();
      expect(s.rubric?.context).toHaveLength(3);
      expect(s.rubric?.register).toHaveLength(3);
      expect(s.rubric?.strategy).toHaveLength(3);
    }
  });
  it("id 중복 없음", () => {
    const ids = SITUATIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
