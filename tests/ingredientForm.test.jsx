// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import IngredientForm from "../frontend/src/components/IngredientForm";

const baseFormValues = {
  name: "양파",
  quantity: "4",
  unit: "개",
  storage: "fridge",
  category: "vegetable",
  expirationDate: "2026-07-30",
  expirySource: "manual",
  tags: ["vegetable"],
};

function renderForm(overrides = {}) {
  const onChange = vi.fn();
  render(
    <IngredientForm
      formValues={{ ...baseFormValues, ...overrides }}
      errors={{}}
      isEditing
      isSubmitting={false}
      onChange={onChange}
      onBlur={vi.fn()}
      onTagToggle={vi.fn()}
      onApplySuggestedDate={vi.fn()}
      onSubmit={(event) => event.preventDefault()}
      onCancel={vi.fn()}
    />,
  );
  return onChange;
}

describe("재료 수량 입력", () => {
  test("개 단위는 정수를 유효한 값으로 입력한다", () => {
    renderForm();

    const quantityInput = screen.getByLabelText("수량");
    expect(quantityInput).toHaveAttribute("min", "1");
    expect(quantityInput).toHaveAttribute("step", "1");
    expect(quantityInput).toHaveAttribute("inputmode", "numeric");
    expect(quantityInput.validity.valid).toBe(true);
  });

  test("개 단위의 증감 버튼은 1씩 변경하고 최소 1을 유지한다", () => {
    const onChange = renderForm({ quantity: "1" });

    fireEvent.click(screen.getByRole("button", { name: "수량 1 감소" }));
    fireEvent.click(screen.getByRole("button", { name: "수량 1 증가" }));

    expect(onChange).toHaveBeenNthCalledWith(1, {
      target: { name: "quantity", value: "1" },
    });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      target: { name: "quantity", value: "2" },
    });
  });

  test("무게 단위는 소수 입력을 허용한다", () => {
    renderForm({ quantity: "0.5", unit: "g" });

    const quantityInput = screen.getByLabelText("수량");
    expect(quantityInput).toHaveAttribute("min", "0.001");
    expect(quantityInput).toHaveAttribute("step", "any");
    expect(quantityInput).toHaveAttribute("inputmode", "decimal");
    expect(quantityInput.validity.valid).toBe(true);
  });

  test("수량 단위 선택지는 개, g, 팩으로 통일한다", () => {
    renderForm();

    const unitSelect = screen.getByLabelText("수량 단위");
    expect(unitSelect).toHaveDisplayValue("개");
    expect(within(unitSelect).getAllByRole("option").map((option) => option.value))
      .toEqual(["개", "g", "팩"]);
  });
});
