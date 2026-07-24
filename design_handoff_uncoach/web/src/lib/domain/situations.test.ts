import { describe, it, expect } from "vitest";
import { totalOf, personaOf, getSituation, splitBubbles, SITUATIONS, situationsForRole, ROLES } from "./situations";
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

  it("모든 상황에 직업 태그가 있다 — 태그가 없으면 필터에서 영영 안 보인다", () => {
    for (const s of SITUATIONS) expect(s.roles?.length ?? 0).toBeGreaterThan(0);
  });

  it("온보딩에 있는 직업만 태그로 쓴다 — 오타 하나면 그 상황이 사라진다", () => {
    const known = new Set(ROLES.map(([name]) => name));
    for (const s of SITUATIONS) {
      for (const r of s.roles ?? []) expect(known).toContain(r);
    }
  });
});

describe("situationsForRole", () => {
  it("내 직업 상황만 준다 — 예전엔 정렬만 해서 대학생에게 민원 응대가 노출됐다", () => {
    const list = situationsForRole("대학생", "chat");
    expect(list.length).toBeGreaterThan(0);
    for (const s of list) expect(s.roles).toContain("대학생");
  });

  it("kind로 대화/메일이 갈린다", () => {
    for (const s of situationsForRole("대학생", "email")) expect(s.medium).toBe("email");
    for (const s of situationsForRole("대학생", "chat")) expect(s.medium).not.toBe("email");
  });

  it("직업이 없으면(온보딩 전) 전체를 준다", () => {
    expect(situationsForRole(undefined, "chat").length).toBeGreaterThan(
      situationsForRole("대학생", "chat").length,
    );
  });

  it("모르는 직업이면 빈 목록 — 조용히 남의 상황을 섞지 않는다", () => {
    expect(situationsForRole("점성술사", "chat")).toEqual([]);
  });

  it("모든 직업이 대화 3개·메일 2개 이상을 갖는다 — 픽커가 비면 훈련 자체가 막힌다", () => {
    for (const [role] of ROLES) {
      expect(situationsForRole(role, "chat").length, `${role} 대화`).toBeGreaterThanOrEqual(3);
      expect(situationsForRole(role, "email").length, `${role} 메일`).toBeGreaterThanOrEqual(2);
    }
  });
});
