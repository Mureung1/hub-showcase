import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import RecipeDraftRoute from "./RecipeDraftRoute";

const structuredRecipe = {
  draft: {
    title: "김치찌개",
    description: null,
    servings: "2인분",
    cookingTimeMinutes: 30,
    ingredients: [{ name: "김치", amount: "200", unit: "g", order: 1 }],
    steps: [{ order: 1, description: "김치를 볶는다." }],
    source: null,
  },
  warnings: [],
};

function renderDraftRoute(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/recipes/new" element={<p>레시피 입력 화면</p>} />
        <Route
          path="/recipes/draft"
          element={
            <RecipeDraftRoute>
              <p>초안 편집 화면</p>
            </RecipeDraftRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("RecipeDraftRoute", () => {
  it("검증된 초안 상태가 있으면 편집 단계를 표시한다", () => {
    renderDraftRoute({
      pathname: "/recipes/draft",
      state: structuredRecipe,
    });

    expect(screen.getByText("초안 편집 화면")).toBeInTheDocument();
  });

  it("새로고침이나 직접 접근처럼 초안 상태가 없으면 입력 화면으로 돌려보낸다", () => {
    renderDraftRoute("/recipes/draft");

    expect(screen.getByText("레시피 입력 화면")).toBeInTheDocument();
    expect(screen.queryByText("초안 편집 화면")).not.toBeInTheDocument();
  });

  it("빈 초안은 편집 단계로 넘기지 않는다", () => {
    renderDraftRoute({
      pathname: "/recipes/draft",
      state: {
        draft: {
          ...structuredRecipe.draft,
          title: "",
        },
        warnings: [],
      },
    });

    expect(screen.getByText("레시피 입력 화면")).toBeInTheDocument();
  });
});
