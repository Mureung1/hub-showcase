import { describe, it, expect } from "vitest";
import { parsePromo, applyPromo } from "./promo";
import { SCENARIOS } from "./mocks/scenarios";

/**
 * 회귀 대상: 정액 쿠폰("2,000원 할인")이 검토 화면에서 "0% 할인"으로 덮어써지던 버그.
 * mocks/scenarios의 실제 promo 문구를 그대로 넣어, 데모에서 보이는 값으로 검증한다.
 */

describe("parsePromo — 혜택 형태 판별", () => {
  it("정률 쿠폰은 rate", () => {
    expect(parsePromo("픽업 주문 10% 할인 (오늘 하루)")).toEqual({ kind: "rate", pct: 10 });
    expect(parsePromo("픽업 15 % 할인")).toEqual({ kind: "rate", pct: 15 });
  });

  it("정액 쿠폰은 amount — 천단위 쉼표를 벗긴 숫자", () => {
    expect(parsePromo("따뜻한 세트 2,000원 할인 (단골 전용)")).toEqual({
      kind: "amount",
      won: 2000,
    });
    expect(parsePromo("세트 1500원 쿠폰")).toEqual({ kind: "amount", won: 1500 });
  });

  it("%와 금액이 같이 있으면 정률이 우선", () => {
    // 사장님이 조절할 대상은 할인율이고, 금액은 조건(최소 주문액)일 가능성이 높다.
    expect(parsePromo("픽업 10% 할인 (5,000원 이상)")).toEqual({ kind: "rate", pct: 10 });
  });

  it("조건 금액만 있으면 none — 할인액으로 오인하지 않는다", () => {
    expect(parsePromo("5,000원 이상 주문 시 사은품")).toEqual({ kind: "none" });
  });

  it("숫자가 없으면 none", () => {
    expect(parsePromo("아메리카노 증정")).toEqual({ kind: "none" });
    expect(parsePromo("")).toEqual({ kind: "none" });
  });
});

describe("applyPromo — 편집값 되쓰기", () => {
  it("정률은 숫자만 바꾸고 설명은 남긴다", () => {
    expect(applyPromo("픽업 주문 10% 할인 (오늘 하루)", { kind: "rate", pct: 12 })).toBe(
      "픽업 주문 12% 할인 (오늘 하루)",
    );
  });

  it("정액은 천단위 쉼표를 붙여 되쓴다", () => {
    expect(
      applyPromo("따뜻한 세트 2,000원 할인 (단골 전용)", { kind: "amount", won: 2500 }),
    ).toBe("따뜻한 세트 2,500원 할인 (단골 전용)");
  });

  it("형태가 문구와 안 맞으면 원문을 그대로 둔다 (회귀: '0% 할인'으로 덮어쓰던 버그)", () => {
    const amountPromo = "따뜻한 세트 2,000원 할인 (단골 전용)";
    expect(applyPromo(amountPromo, { kind: "rate", pct: 12 })).toBe(amountPromo);
    expect(applyPromo(amountPromo, { kind: "none" })).toBe(amountPromo);

    const ratePromo = "픽업 주문 10% 할인";
    expect(applyPromo(ratePromo, { kind: "amount", won: 2000 })).toBe(ratePromo);
  });

  it("0도 정상 편집값이다 (사장님이 할인을 뺀 경우)", () => {
    expect(applyPromo("픽업 주문 10% 할인", { kind: "rate", pct: 0 })).toBe("픽업 주문 0% 할인");
  });

  it("같은 문구를 연달아 편집해도 결과가 같다 (정규식 lastIndex 오염 방지)", () => {
    const promo = "따뜻한 세트 2,000원 할인";
    const edit = { kind: "amount", won: 2500 } as const;
    expect(applyPromo(promo, edit)).toBe(applyPromo(promo, edit));
  });
});

describe("mock 시나리오 4개 왕복", () => {
  it("parse → apply 왕복이 원문을 바꾸지 않는다", () => {
    // goEdit()이 하는 일과 동일: promo에서 혜택을 읽어 그대로 되돌린다.
    for (const key of Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[]) {
      const { promo } = SCENARIOS[key];
      expect(applyPromo(promo, parsePromo(promo))).toBe(promo);
    }
  });

  it("한파 시나리오는 정액으로 읽혀 금액 입력이 뜬다", () => {
    expect(parsePromo(SCENARIOS.cold.promo)).toEqual({ kind: "amount", won: 2000 });
  });
});
