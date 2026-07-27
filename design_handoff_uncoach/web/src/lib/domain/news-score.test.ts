import { describe, it, expect } from "vitest";
import { NEWS_AXES, toScores, fromScores, clampLevel, copyOverlap, isCopied } from "./news-score";
import { modeOf, newsSid, totalOf, AXES } from "./situations";
import type { NewsScores } from "./news-score";

const n = (grasp: number, accuracy: number, concision: number): NewsScores => ({ grasp, accuracy, concision });

describe("NEWS_AXES", () => {
  it("3축이고 가중치 합이 100", () => {
    expect(NEWS_AXES).toHaveLength(3);
    expect(NEWS_AXES.reduce((s, a) => s + a.weight, 0)).toBe(100);
  });

  it("축마다 1·2·3점 기준 문구가 다 있다", () => {
    for (const ax of NEWS_AXES) {
      expect(ax.levels).toHaveLength(3);
      for (const t of ax.levels) expect(t.length).toBeGreaterThan(5);
      expect(new Set(ax.levels).size).toBe(3); // 서로 다른 문구
    }
  });

  it("저장 3축과 가중치가 같아 총점이 호환된다", () => {
    expect(NEWS_AXES.map((a) => a.weight)).toEqual(AXES.map((a) => a.weight));
  });
});

describe("toScores / fromScores", () => {
  it("만점은 총점 100", () => {
    expect(totalOf(toScores(n(3, 3, 3)))).toBe(100);
  });

  it("최저점은 총점 33", () => {
    expect(totalOf(toScores(n(1, 1, 1)))).toBe(33);
  });

  it("가중치 40인 핵심 포착이 총점을 가장 크게 움직인다", () => {
    const base = totalOf(toScores(n(1, 1, 1)));
    const byGrasp = totalOf(toScores(n(3, 1, 1))) - base;
    const byAccuracy = totalOf(toScores(n(1, 3, 1))) - base;
    expect(byGrasp).toBeGreaterThan(byAccuracy);
  });

  it("왕복해도 값이 보존된다", () => {
    const s = n(3, 1, 2);
    expect(fromScores(toScores(s))).toEqual(s);
  });

  it("축마다 다른 슬롯에 들어간다(덮어쓰기 없음)", () => {
    const stored = toScores(n(3, 2, 1));
    expect(new Set(Object.keys(stored)).size).toBe(3);
    expect(Object.values(stored).sort()).toEqual([1, 2, 3]);
  });
});

describe("clampLevel", () => {
  it("1~3 범위는 그대로", () => {
    expect(clampLevel(1)).toBe(1);
    expect(clampLevel(3)).toBe(3);
  });

  it("범위를 벗어나면 잘라낸다 — 모델이 0이나 5를 뱉어도 채점표가 안 깨지게", () => {
    expect(clampLevel(0)).toBe(1);
    expect(clampLevel(-2)).toBe(1);
    expect(clampLevel(5)).toBe(3);
    expect(clampLevel(100)).toBe(3);
  });

  it("소수는 반올림", () => {
    expect(clampLevel(2.4)).toBe(2);
    expect(clampLevel(2.6)).toBe(3);
  });

  it("값이 없거나 숫자가 아니면 중간(2)", () => {
    expect(clampLevel(undefined)).toBe(2);
    expect(clampLevel(null)).toBe(2);
    expect(clampLevel("좋음")).toBe(2);
    expect(clampLevel(NaN)).toBe(2);
  });

  it("숫자 문자열은 받아준다", () => {
    expect(clampLevel("3")).toBe(3);
  });
});

describe("copyOverlap / isCopied", () => {
  const passage =
    "정부가 오늘 청년 주택 지원 정책을 발표했다. 만 39세 이하 무주택 청년에게 전세 대출 한도를 기존보다 두 배로 늘려준다. 시장에서는 실효성을 두고 의견이 갈린다.";

  it("지문 첫 문장을 그대로 옮기면 복붙으로 잡힌다", () => {
    const draft = "정부가 오늘 청년 주택 지원 정책을 발표했다";
    const { ratio, runTokens } = copyOverlap(draft, passage);
    expect(runTokens).toBeGreaterThanOrEqual(6);
    expect(ratio).toBeGreaterThanOrEqual(0.6);
    expect(isCopied(draft, passage)).toBe(true);
  });

  it("내 말로 다시 쓴 요약은 통과한다", () => {
    const draft = "청년 전세 대출 한도를 두 배로 늘리는 지원책이 나왔지만 효과엔 논란이 있다.";
    expect(isCopied(draft, passage)).toBe(false);
  });

  it("고유명사·수치가 겹쳐도 짧은 인용이면 통과한다", () => {
    const draft = "청년 주택 지원, 전세 대출 확대가 핵심.";
    expect(isCopied(draft, passage)).toBe(false);
  });

  it("빈 입력은 0", () => {
    expect(copyOverlap("", passage)).toEqual({ ratio: 0, runTokens: 0 });
    expect(isCopied("", passage)).toBe(false);
  });

  it("복붙은 두 축(핵심·압축) 1점이라 총점이 pass 밑으로 떨어진다", () => {
    // 라우트의 감점을 그대로 재현: grasp=1, concision=1, accuracy는 정직하게 3
    const total = totalOf(toScores(n(1, 3, 1)));
    expect(total).toBeLessThan(80);
  });
});

describe("newsSid", () => {
  it("카테고리 단위 sid라 같은 분야를 반복해도 같은 상황으로 잡힌다", () => {
    expect(newsSid("market")).toBe("news:market");
    expect(newsSid("market")).toBe(newsSid("market"));
  });

  it("뉴스 기록은 상황 목록에 없어도 뉴스 모드로 분류된다", () => {
    expect(modeOf(newsSid("tech"))).toBe("news");
    expect(modeOf("mail-delay", { medium: "email" } as never)).toBe("email");
    expect(modeOf("pq")).toBe("chat");
  });
});
