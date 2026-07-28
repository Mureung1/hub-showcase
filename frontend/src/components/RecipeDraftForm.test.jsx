import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecipeDraftForm from "./RecipeDraftForm";

const draft = {
  title: "김치찌개",
  description: "돼지고기를 넣은 김치찌개",
  servings: "2인분",
  cookingTimeMinutes: 30,
  ingredients: [
    { name: "김치", amount: "200", unit: "g", order: 1 },
  ],
  steps: [{ order: 1, description: "김치를 볶는다." }],
  source: null,
};

describe("RecipeDraftForm", () => {
  afterEach(cleanup);

  it("AI 초안의 기본 정보를 표시하고 수정한다", () => {
    render(
      <RecipeDraftForm
        initialDraft={draft}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const titleInput = screen.getByLabelText("음식 이름");

    expect(titleInput).toHaveValue("김치찌개");
    expect(screen.getByLabelText("레시피 설명")).toHaveValue(
      "돼지고기를 넣은 김치찌개",
    );
    expect(screen.getByLabelText("기준 인원")).toHaveValue("2인분");
    expect(screen.getByLabelText("예상 조리 시간")).toHaveValue(30);

    fireEvent.change(titleInput, {
      target: { value: "참치 김치찌개" },
    });

    expect(titleInput).toHaveValue("참치 김치찌개");
  });
  it("빈 음식 이름은 제출하지 않고 입력 근처에 오류를 표시한다", () => {
    const onSubmit = vi.fn();

    render(
      <RecipeDraftForm
        initialDraft={draft}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const titleInput = screen.getByLabelText("음식 이름");

    fireEvent.change(titleInput, {
      target: { value: "   " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "저장하기" }),
    );

    const error = screen.getByText("음식 이름을 입력해주세요.");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(titleInput).toHaveAttribute("aria-invalid", "true");
    expect(error).toHaveAttribute("id");
    expect(titleInput).toHaveAttribute(
      "aria-describedby",
      error.getAttribute("id"),
    );
  });

  it.each(["-1", "1.5"])(
    "조리 시간이 %s이면 제출하지 않고 입력 근처에 오류를 표시한다",
    (invalidCookingTime) => {
      const onSubmit = vi.fn();

      render(
        <RecipeDraftForm
          initialDraft={draft}
          warnings={[]}
          onCancel={vi.fn()}
          onSubmit={onSubmit}
        />,
      );

      const cookingTimeInput = screen.getByLabelText("예상 조리 시간");
      const submitButton = screen.getByRole("button", { name: "저장하기" });

      fireEvent.change(cookingTimeInput, {
        target: { value: invalidCookingTime },
      });
      submitButton.focus();
      fireEvent.submit(submitButton.closest("form"));

      const error = screen.getByText(
        "조리 시간은 0 이상의 정수로 입력해주세요.",
      );

      expect(onSubmit).not.toHaveBeenCalled();
      expect(cookingTimeInput).toHaveAttribute("aria-invalid", "true");
      expect(error).toHaveAttribute("id");
      expect(cookingTimeInput).toHaveAttribute(
        "aria-describedby",
        error.getAttribute("id"),
      );
      expect(cookingTimeInput).toHaveFocus();
    },
  );

  it("재료의 이름, 수량과 단위를 표시하고 수정한다", () => {
    render(
      <RecipeDraftForm
        initialDraft={draft}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const ingredientNameInput = screen.getByLabelText("재료 1 이름");
    const ingredientAmountInput = screen.getByLabelText("재료 1 수량");
    const ingredientUnitInput = screen.getByLabelText("재료 1 단위");

    expect(ingredientNameInput).toHaveValue("김치");
    expect(ingredientAmountInput).toHaveValue("200");
    expect(ingredientUnitInput).toHaveValue("g");

    fireEvent.change(ingredientAmountInput, {
      target: { value: "250" },
    });

    expect(ingredientAmountInput).toHaveValue("250");
  });

  it("조리 단계 내용을 표시하고 수정한다", () => {
    render(
      <RecipeDraftForm
        initialDraft={draft}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const stepInput = screen.getByLabelText("조리 단계 1 내용");

    expect(stepInput).toHaveValue("김치를 볶는다.");

    fireEvent.change(stepInput, {
      target: { value: "김치와 참치를 함께 볶는다." },
    });

    expect(stepInput).toHaveValue("김치와 참치를 함께 볶는다.");
  });

  it("빈 재료명과 조리 단계는 제출하지 않고 입력 근처에 오류를 표시한다", () => {
    const onSubmit = vi.fn();

    render(
      <RecipeDraftForm
        initialDraft={draft}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const ingredientNameInput = screen.getByLabelText("재료 1 이름");
    const stepInput = screen.getByLabelText("조리 단계 1 내용");
    const submitButton = screen.getByRole("button", { name: "저장하기" });

    fireEvent.change(ingredientNameInput, {
      target: { value: "   " },
    });
    fireEvent.change(stepInput, {
      target: { value: "   " },
    });
    submitButton.focus();
    fireEvent.submit(submitButton.closest("form"));

    const ingredientError = screen.getByText(
      "재료 이름을 입력해주세요.",
    );
    const stepError = screen.getByText(
      "조리 단계 내용을 입력해주세요.",
    );

    expect(onSubmit).not.toHaveBeenCalled();

    expect(ingredientNameInput).toHaveAttribute("aria-invalid", "true");
    expect(ingredientError).toHaveAttribute("id");
    expect(ingredientNameInput).toHaveAttribute(
      "aria-describedby",
      ingredientError.getAttribute("id"),
    );

    expect(stepInput).toHaveAttribute("aria-invalid", "true");
    expect(stepError).toHaveAttribute("id");
    expect(stepInput).toHaveAttribute(
      "aria-describedby",
      stepError.getAttribute("id"),
    );
    expect(ingredientNameInput).toHaveFocus();

    fireEvent.change(ingredientNameInput, {
      target: { value: "김치" },
    });
    submitButton.focus();
    fireEvent.submit(submitButton.closest("form"));

    expect(stepInput).toHaveFocus();
  });

  it.each([
    ["title", "음식 이름"],
    ["description", "레시피 설명"],
    ["servings", "기준 인원"],
    ["cookingTimeMinutes", "예상 조리 시간"],
    ["ingredients[0].name", "재료 1 이름"],
    ["ingredients[0].amount", "재료 1 수량"],
    ["ingredients[0].unit", "재료 1 단위"],
    ["steps[0].description", "조리 단계 1 내용"],
  ])(
    "AI 경고 $field를 관련 입력에 연결해 표시한다",
    (field, inputLabel) => {
      const warning = {
        field,
        message: `${field} 값을 확인해주세요.`,
        suggestedValue: null,
      };

      render(
        <RecipeDraftForm
          initialDraft={draft}
          warnings={[warning]}
          onCancel={vi.fn()}
          onSubmit={vi.fn()}
        />,
      );

      const input = screen.getByLabelText(inputLabel);
      const warningMessage = screen.getByText(warning.message);

      expect(warningMessage).toHaveAttribute("id");
      expect(input).toHaveAttribute(
        "aria-describedby",
        warningMessage.getAttribute("id"),
      );
    },
  );

  it("출처를 수정 입력이 아닌 보조 정보로 표시한다", () => {
    const sourcedDraft = {
      ...draft,
      source: {
        url: "https://example.com/recipe",
        title: "김치찌개 만들기",
        author: "레시피 작성자",
      },
    };

    render(
      <RecipeDraftForm
        initialDraft={sourcedDraft}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const sourceLink = screen.getByRole("link", {
      name: "김치찌개 만들기",
    });

    expect(sourceLink).toHaveAttribute(
      "href",
      "https://example.com/recipe",
    );
    expect(screen.getByText("레시피 작성자")).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/출처 URL|출처 제목|출처 작성자/),
    ).not.toBeInTheDocument();
  });

  it("수정 모드에서 출처를 편집하고 빈 URL은 출처 없음으로 제출한다", () => {
    const onSubmit = vi.fn();
    const sourcedDraft = {
      ...draft,
      source: {
        url: "https://example.com/recipe",
        title: "김치찌개 만들기",
        author: "레시피 작성자",
      },
    };

    render(
      <RecipeDraftForm
        initialDraft={sourcedDraft}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        isSourceEditable
      />,
    );

    expect(screen.getByLabelText("출처 URL")).toHaveValue(
      "https://example.com/recipe",
    );
    expect(screen.getByLabelText("출처 제목")).toHaveValue(
      "김치찌개 만들기",
    );
    expect(screen.getByLabelText("출처 작성자 또는 채널명")).toHaveValue(
      "레시피 작성자",
    );

    fireEvent.change(screen.getByLabelText("출처 URL"), {
      target: { value: " https://example.com/updated-recipe " },
    });
    fireEvent.change(screen.getByLabelText("출처 제목"), {
      target: { value: " 수정한 원본 " },
    });
    fireEvent.change(screen.getByLabelText("출처 작성자 또는 채널명"), {
      target: { value: " 새 작성자 " },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "저장하기" }).closest("form"),
    );

    expect(onSubmit).toHaveBeenLastCalledWith({
      ...sourcedDraft,
      source: {
        url: "https://example.com/updated-recipe",
        title: "수정한 원본",
        author: "새 작성자",
      },
    });

    fireEvent.change(screen.getByLabelText("출처 URL"), {
      target: { value: "   " },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "저장하기" }).closest("form"),
    );

    expect(onSubmit).toHaveBeenLastCalledWith({
      ...sourcedDraft,
      source: null,
    });
  });

  it("수정 모드에서 출처가 없는 레시피에 출처를 추가한다", () => {
    const onSubmit = vi.fn();

    render(
      <RecipeDraftForm
        initialDraft={draft}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        isSourceEditable
      />,
    );

    fireEvent.change(screen.getByLabelText("출처 URL"), {
      target: { value: "https://example.com/new-source" },
    });
    fireEvent.change(screen.getByLabelText("출처 제목"), {
      target: { value: "새 출처" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "저장하기" }).closest("form"),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      ...draft,
      source: {
        url: "https://example.com/new-source",
        title: "새 출처",
        author: null,
      },
    });
  });

  it("재료를 추가·삭제한 뒤 순서를 1부터 다시 맞춘다", () => {
    const onSubmit = vi.fn();
    const draftWithTwoIngredients = {
      ...draft,
      ingredients: [
        draft.ingredients[0],
        { name: "양파", amount: "1", unit: "개", order: 2 },
      ],
    };

    render(
      <RecipeDraftForm
        initialDraft={draftWithTwoIngredients}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "재료 추가" }),
    );
    fireEvent.change(screen.getByLabelText("재료 3 이름"), {
      target: { value: "두부" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "재료 1 삭제" }),
    );

    expect(screen.getByLabelText("재료 1 이름")).toHaveValue("양파");
    expect(screen.getByLabelText("재료 2 이름")).toHaveValue("두부");

    fireEvent.submit(
      screen.getByRole("button", { name: "저장하기" }).closest("form"),
    );

    const submittedIngredients =
      onSubmit.mock.calls[0][0].ingredients.map(({ name, order }) => ({
        name,
        order,
      }));

    expect(submittedIngredients).toEqual([
      { name: "양파", order: 1 },
      { name: "두부", order: 2 },
    ]);
  });

  it("조리 단계를 추가·삭제한 뒤 순서를 1부터 다시 맞춘다", () => {
    const onSubmit = vi.fn();
    const draftWithTwoSteps = {
      ...draft,
      steps: [
        draft.steps[0],
        { order: 2, description: "물을 붓는다." },
      ],
    };

    render(
      <RecipeDraftForm
        initialDraft={draftWithTwoSteps}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "조리 단계 추가" }),
    );
    fireEvent.change(screen.getByLabelText("조리 단계 3 내용"), {
      target: { value: "충분히 끓인다." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "조리 단계 1 삭제" }),
    );

    expect(screen.getByLabelText("조리 단계 1 내용")).toHaveValue(
      "물을 붓는다.",
    );
    expect(screen.getByLabelText("조리 단계 2 내용")).toHaveValue(
      "충분히 끓인다.",
    );

    fireEvent.submit(
      screen.getByRole("button", { name: "저장하기" }).closest("form"),
    );

    const submittedSteps = onSubmit.mock.calls[0][0].steps.map(
      ({ description, order }) => ({ description, order }),
    );

    expect(submittedSteps).toEqual([
      { description: "물을 붓는다.", order: 1 },
      { description: "충분히 끓인다.", order: 2 },
    ]);
  });

  it("취소 버튼을 누르면 초안 이탈을 요청한다", () => {
    const onCancel = vi.fn();

    render(
      <RecipeDraftForm
        initialDraft={draft}
        warnings={[]}
        onCancel={onCancel}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("재료 순서를 위로 이동하고 경계 이동 버튼을 비활성화한다", () => {
    const onSubmit = vi.fn();
    const draftWithTwoIngredients = {
      ...draft,
      ingredients: [
        draft.ingredients[0],
        { name: "양파", amount: "1", unit: "개", order: 2 },
      ],
    };

    render(
      <RecipeDraftForm
        initialDraft={draftWithTwoIngredients}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByRole("button", { name: "재료 1 위로 이동" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "재료 2 아래로 이동" }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "재료 2 위로 이동" }),
    );

    expect(screen.getByLabelText("재료 1 이름")).toHaveValue("양파");
    expect(screen.getByLabelText("재료 2 이름")).toHaveValue("김치");

    fireEvent.submit(
      screen.getByRole("button", { name: "저장하기" }).closest("form"),
    );

    expect(
      onSubmit.mock.calls[0][0].ingredients.map(({ name, order }) => ({
        name,
        order,
      })),
    ).toEqual([
      { name: "양파", order: 1 },
      { name: "김치", order: 2 },
    ]);  
  });

  it("조리 단계 순서를 위로 이동하고 경계 이동 버튼을 비활성화한다", () => {
    const onSubmit = vi.fn();
    const draftWithTwoSteps = {
      ...draft,
      steps: [
        draft.steps[0],
        { order: 2, description: "물을 붓는다." },
      ],
    };

    render(
      <RecipeDraftForm
        initialDraft={draftWithTwoSteps}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByRole("button", { name: "조리 단계 1 위로 이동" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "조리 단계 2 아래로 이동" }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "조리 단계 2 위로 이동" }),
    );

    expect(screen.getByLabelText("조리 단계 1 내용")).toHaveValue(
      "물을 붓는다.",
    );
    expect(screen.getByLabelText("조리 단계 2 내용")).toHaveValue(
      "김치를 볶는다.",
    );

    fireEvent.submit(
      screen.getByRole("button", { name: "저장하기" }).closest("form"),
    );

    expect(
      onSubmit.mock.calls[0][0].steps.map(({ description, order }) => ({
        description,
        order,
      })),
    ).toEqual([
      { description: "물을 붓는다.", order: 1 },
      { description: "김치를 볶는다.", order: 2 },
    ]);  
  });

  it("제목 검증 실패 시 제목 입력으로 초점을 이동한다", () => {
    render(
      <RecipeDraftForm
        initialDraft={draft}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const titleInput = screen.getByLabelText("음식 이름");
    const submitButton = screen.getByRole("button", { name: "저장하기" });

    fireEvent.change(titleInput, {
      target: { value: "   " },
    });
    submitButton.focus();
    fireEvent.click(submitButton);

    expect(titleInput).toHaveFocus();
  });

  it("제출할 초안의 빈 선택값은 null로 바꾸고 문자열 공백을 제거한다", () => {
    const onSubmit = vi.fn();
    const draftWithEmptyOptionalValues = {
      ...draft,
      title: " 김치찌개 ",
      description: null,
      servings: null,
      cookingTimeMinutes: null,
      ingredients: [
        {
          name: " 김치 ",
          amount: null,
          unit: null,
          order: 1,
        },
      ],
      steps: [
        {
          order: 1,
          description: " 김치를 볶는다. ",
        },
      ],
    };

    render(
      <RecipeDraftForm
        initialDraft={draftWithEmptyOptionalValues}
        warnings={[]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.submit(
      screen.getByRole("button", { name: "저장하기" }).closest("form"),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      ...draftWithEmptyOptionalValues,
      title: "김치찌개",
      description: null,
      servings: null,
      cookingTimeMinutes: null,
      ingredients: [
        {
          name: "김치",
          amount: null,
          unit: null,
          order: 1,
        },
      ],
      steps: [
        {
          order: 1,
          description: "김치를 볶는다.",
        },
      ],
    });
  });
});
