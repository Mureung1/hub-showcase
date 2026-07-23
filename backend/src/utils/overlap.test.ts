import { describe, expect, it } from "vitest";
import { buildOverlapResult, type OverlapRow } from "./overlap";

function makeRow(overrides: Partial<OverlapRow> = {}): OverlapRow {
  return {
    ingredient_id: 1,
    ingredient_name: "비타민C",
    upper_limit_mg: null,
    total_amount_mg: null,
    ...overrides,
  };
}

describe("buildOverlapResult", () => {
  describe("정상 케이스", () => {
    it("상한 이내이면 isExceeded는 false다", () => {
      const result = buildOverlapResult(makeRow({ total_amount_mg: 500, upper_limit_mg: 1000 }));

      expect(result.isExceeded).toBe(false);
      expect(result.message).toContain("이내예요");
    });

    it("상한을 초과하면 isExceeded는 true다", () => {
      const result = buildOverlapResult(makeRow({ total_amount_mg: 1500, upper_limit_mg: 1000 }));

      expect(result.isExceeded).toBe(true);
      expect(result.message).toContain("초과해서 부작용 위험");
    });

    it("숫자 문자열로 들어와도 숫자로 변환해 비교한다 (DB SUM 결과 대응)", () => {
      const result = buildOverlapResult(makeRow({ total_amount_mg: "500", upper_limit_mg: "1000" }));

      expect(result.totalAmountMg).toBe(500);
      expect(result.upperLimitMg).toBe(1000);
      expect(typeof result.totalAmountMg).toBe("number");
      expect(typeof result.upperLimitMg).toBe("number");
      expect(result.isExceeded).toBe(false);
    });
  });

  describe("빈 값(null) 케이스", () => {
    it("상한 섭취량 기준이 없으면 판단 불가 메시지를 반환한다", () => {
      const result = buildOverlapResult(makeRow({ total_amount_mg: 500, upper_limit_mg: null }));

      expect(result.isExceeded).toBe(false);
      expect(result.upperLimitMg).toBeNull();
      expect(result.message).toContain("판단할 수 없어요");
    });

    it("섭취량 데이터가 없으면 판단 불가 메시지를 반환한다", () => {
      const result = buildOverlapResult(makeRow({ total_amount_mg: null, upper_limit_mg: 1000 }));

      expect(result.isExceeded).toBe(false);
      expect(result.totalAmountMg).toBeNull();
      expect(result.message).toContain("판단할 수 없어요");
    });

    it("둘 다 없으면 판단 불가 메시지를 반환한다", () => {
      const result = buildOverlapResult(makeRow({ total_amount_mg: null, upper_limit_mg: null }));

      expect(result.isExceeded).toBe(false);
      expect(result.message).toContain("판단할 수 없어요");
    });
  });

  describe("경계값 케이스", () => {
    it("섭취량이 상한값과 정확히 같으면 초과가 아니다 (> 비교이므로)", () => {
      const result = buildOverlapResult(makeRow({ total_amount_mg: 1000, upper_limit_mg: 1000 }));

      expect(result.isExceeded).toBe(false);
      expect(result.message).toContain("이내예요");
    });

    it("상한값보다 근소하게(0.01mg) 초과하면 초과로 판정한다", () => {
      const result = buildOverlapResult(makeRow({ total_amount_mg: 1000.01, upper_limit_mg: 1000 }));

      expect(result.isExceeded).toBe(true);
    });

    it("섭취량이 0이어도 null과 구분되어 정상 비교된다", () => {
      const result = buildOverlapResult(makeRow({ total_amount_mg: 0, upper_limit_mg: 1000 }));

      expect(result.totalAmountMg).toBe(0);
      expect(result.isExceeded).toBe(false);
      expect(result.message).toContain("0mg 드시고 있어요");
    });

    it("상한값이 0이면 양수 섭취량은 모두 초과로 판정한다", () => {
      const result = buildOverlapResult(makeRow({ total_amount_mg: 5, upper_limit_mg: 0 }));

      expect(result.isExceeded).toBe(true);
    });
  });
});
