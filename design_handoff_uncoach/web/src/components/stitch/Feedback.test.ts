import { describe, it, expect } from "vitest";
import { situationRubricRows } from "./Feedback";
import { AXES, SITUATIONS } from "@/lib/domain/situations";
import type { Scores } from "@/lib/domain/types";

// situationRubricRows: 상황별 rubric의 축별 1·2·3점 기준을 올바른 행에 얹고,
// 점수·근거를 짝맞춰 넘기는지. 슬롯이 어긋나면 화면에 엉뚱한 기준/점수가 뜬다.
describe("situationRubricRows", () => {
  const sit = SITUATIONS.find((s) => s.rubric)!;
  const scores: Scores = { context: 3, register: 2, strategy: 1 };
  const reasons = { context: "맥락 근거", register: "격식 근거", strategy: "전략 근거" };
  const rows = situationRubricRows(sit.rubric!, scores, reasons);

  it("축 순서·개수가 AXES와 같다", () => {
    expect(rows.map((r) => r.name)).toEqual(AXES.map((a) => a.name));
  });

  it("각 행의 levels가 그 축의 rubric 기준(3개)과 정확히 일치한다", () => {
    for (const ax of AXES) {
      const row = rows.find((r) => r.name === ax.name)!;
      expect(row.levels).toEqual(sit.rubric![ax.key]);
      expect(row.levels).toHaveLength(3);
    }
  });

  it("점수·근거·가중치가 축별로 짝맞는다", () => {
    const byKey = Object.fromEntries(AXES.map((a) => [a.name, a]));
    for (const row of rows) {
      const ax = byKey[row.name];
      expect(row.score).toBe(scores[ax.key]);
      expect(row.reason).toBe(reasons[ax.key]);
      expect(row.weight).toBe(ax.weight);
    }
  });
});
