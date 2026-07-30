import { describe, expect, test } from "vitest";

import {
  buildIngredientFromForm,
  getIngredientStorageStatus,
  parseQuantityInput,
} from "../frontend/src/utils/ingredientUtils.js";

const NOT_TRACKED = {
  quantity: null,
  unit: null,
  quantityMode: "notTracked",
};

describe("parseQuantityInput", () => {
  describe("정상 입력", () => {
    test.each([
      ["2개", { quantity: 2, unit: "개", quantityMode: "exact" }],
      ["1.5kg", { quantity: 1.5, unit: "kg", quantityMode: "exact" }],
      ["1/2팩", { quantity: 0.5, unit: "팩", quantityMode: "exact" }],
      ["3/4 컵", { quantity: 0.75, unit: "컵", quantityMode: "exact" }],
      ["  2 개  ", { quantity: 2, unit: "개", quantityMode: "exact" }],
      ["10", { quantity: 10, unit: null, quantityMode: "exact" }],
      ["1/2", { quantity: 0.5, unit: null, quantityMode: "exact" }],
    ])("%j을 수량과 단위로 변환한다", (input, expected) => {
      expect(parseQuantityInput(input)).toEqual(expected);
    });
  });

  describe("빈 값", () => {
    test.each(["", "   "])("%j은 수량을 추적하지 않는다", (input) => {
      expect(parseQuantityInput(input)).toEqual(NOT_TRACKED);
    });
  });

  describe("경계값", () => {
    test.each([
      ["0개", { quantity: 0, unit: "개", quantityMode: "exact" }],
      ["0/5팩", { quantity: 0, unit: "팩", quantityMode: "exact" }],
      ["1/1개", { quantity: 1, unit: "개", quantityMode: "exact" }],
      ["0.001kg", { quantity: 0.001, unit: "kg", quantityMode: "exact" }],
      ["999999개", { quantity: 999999, unit: "개", quantityMode: "exact" }],
    ])("%j 경계값을 처리한다", (input, expected) => {
      expect(parseQuantityInput(input)).toEqual(expected);
    });
  });

  describe("해석할 수 없는 입력", () => {
    test.each(["많이", "적당량", "-1kg", ".5kg", "abc123"])(
      "%j은 수량을 추적하지 않는다",
      (input) => {
        expect(parseQuantityInput(input)).toEqual(NOT_TRACKED);
      },
    );
  });

  describe("잘못된 숫자 형식", () => {
    test.each(["1/0개", "0/0개", "1//2개", "1/2.5개", "1.개"])(
      "%j은 수량을 추적하지 않는다",
      (input) => {
        expect(parseQuantityInput(input)).toEqual(NOT_TRACKED);
      },
    );
  });

  describe("문자열이 아닌 입력", () => {
    test.each([null, undefined, 2])("%j을 전달하면 TypeError가 발생한다", (input) => {
      expect(() => parseQuantityInput(input)).toThrow(TypeError);
    });
  });
});

test("분리 입력한 수량과 단위를 재료 데이터로 합친다", () => {
  const ingredient = buildIngredientFromForm({
    name: "계란",
    category: "egg",
    tags: ["nutrition:protein"],
    quantity: "10",
    unit: "개",
    storage: "fridge",
    expirationDate: "2026-07-30",
  });

  expect(ingredient.quantity).toBe(10);
  expect(ingredient.unit).toBe("개");
  expect(ingredient.quantityMode).toBe("exact");
});

describe("재료 보관 상태", () => {
  const referenceDate = new Date("2026-07-30T12:00:00");

  test("등록일을 포함한 보관 일수와 보관 방법을 함께 표시한다", () => {
    expect(getIngredientStorageStatus({
      storage: "fridge",
      storedAt: "2026-07-28",
    }, referenceDate)).toBe("3일째 냉장 보관 중");
  });

  test("오늘 등록한 재료는 1일째로 표시한다", () => {
    expect(getIngredientStorageStatus({
      storage: "room",
      storedAt: "2026-07-30",
    }, referenceDate)).toBe("1일째 실온 보관 중");
  });

  test("등록일이 없으면 보관 방법만 표시한다", () => {
    expect(getIngredientStorageStatus({
      storage: "freezer",
      storedAt: null,
    }, referenceDate)).toBe("냉동 보관 중");
  });
});
