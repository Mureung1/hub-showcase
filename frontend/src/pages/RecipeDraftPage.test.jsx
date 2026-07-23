import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import RecipeDraftPage from "./RecipeDraftPage";

const structuredRecipe = {
  draft: {
    title: "김치찌개",
    description: null,
    servings: "2인분",
    cookingTimeMinutes: 30,
    ingredients: [
      { name: "김치", amount: "200", unit: "g", order: 1 },
    ],
    steps: [{ order: 1, description: "김치를 볶는다." }],
    source: null,
  },
  warnings: [
    {
      field: "title",
      message: "음식 이름을 확인해주세요.",
      suggestedValue: "김치찌개",
    },
  ],
};

afterEach(cleanup);

describe("RecipeDraftPage", () => {
  it("전달받은 초안과 경고를 편집 폼에 표시하고 취소하면 입력 화면으로 돌아간다", () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/recipes/draft",
            state: structuredRecipe,
          },
        ]}
      >
        <Routes>
          <Route path="/recipes/new" element={<p>레시피 입력 화면</p>} />
          <Route path="/recipes/draft" element={<RecipeDraftPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("음식 이름")).toHaveValue("김치찌개");
    expect(
      screen.getByText("음식 이름을 확인해주세요."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.getByText("레시피 입력 화면")).toBeInTheDocument();
  });
});
