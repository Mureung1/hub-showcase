// @vitest-environment jsdom

import { afterEach, expect, test } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import App from "../frontend/src/App.jsx";

const originalFetch = globalThis.fetch;

const recipe = {
  id: "recipe-test-1",
  fingerprint: "b".repeat(64),
  name: "간장 두부 덮밥",
  description: "노릇하게 구운 두부와 짭조름한 간장 소스를 밥에 얹어 먹는 간단한 한 그릇 요리예요.",
  servings: 1,
  requiredIngredients: [{ name: "두부", amount: 1, unit: "모" }, { name: "대파", amount: 1, unit: "대" }],
  optionalIngredients: [],
  cookingTime: 15,
  difficulty: "easy",
  cookingMethod: "fire",
  dishType: "riceBowl",
  effortLevel: "low",
  recommendationReasons: ["보유한 두부를 우선 활용하는 한 끼예요."],
  nutritionTags: ["nutrition:protein"],
  nutritionSummary: "단백질을 중심으로 간단히 먹기 좋은 메뉴예요.",
  substitutions: [{ ingredient: "대파", alternatives: ["양파"], note: "양파를 얇게 썰어 함께 볶아주세요." }],
  steps: ["두부를 노릇하게 굽습니다.", "간장 소스를 넣고 밥에 올립니다."],
  safetyNotes: [],
  missingIngredients: ["대파"],
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  window.localStorage.clear();
});

test("오늘의 메뉴에서 레시피 상세, 구매 링크, 저장 기능으로 이어진다", async () => {
  const requestedModes = [];
  globalThis.fetch = async (url, options) => {
    if (url === "/api/ingredients") return new Response(JSON.stringify({ ingredients: [] }));
    if (url === "/api/recommendations") {
      const request = JSON.parse(options.body);
      requestedModes.push(request.mode);
      return new Response(JSON.stringify({
        recipes: [recipe, { ...recipe, id: "recipe-test-2", fingerprint: "c".repeat(64), name: "두부국", dishType: "soup" }, { ...recipe, id: "recipe-test-3", fingerprint: "d".repeat(64), name: "두부 샐러드", dishType: "salad" }],
        meta: { source: "gemini", maxRecipes: 15, batchNumber: request.batchNumber, maxBatches: 5, stopReason: "qualityLimit" },
      }));
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  render(<App />);

  expect(screen.getByRole("button", { name: "내 냉장고" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "오늘의 메뉴" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "레시피 추천" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "레시피" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "구매 추천" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "레시피 추천" }));
  expect(screen.getByRole("button", { name: "재료 등록하기" })).toBeInTheDocument();
  await screen.findAllByRole("button", { name: "레시피 보기" });
  expect(screen.getByRole("button", { name: "다른 추천 보기 (남은 4회)" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /무난하게 먹고 싶어요/ }));
  await waitFor(() => expect(requestedModes).toContain("quick"));
  expect(screen.getByRole("button", { name: "다른 추천 보기 (남은 4회)" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /균형 있게 먹고 싶어요/ }));
  await waitFor(() => expect(requestedModes).toContain("balanced"));
  expect(screen.getByRole("button", { name: "다른 추천 보기 (남은 4회)" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다른 추천 보기 (남은 4회)" }));
  await screen.findByRole("button", { name: "다른 추천 보기 (남은 3회)" });
  expect(screen.queryByText("오늘의 추천을 모두 확인했어요.")).not.toBeInTheDocument();
  expect(screen.queryByText("억지로 개수를 채우지 않고 품질 기준을 통과한 메뉴만 보여드려요.")).not.toBeInTheDocument();
  const [recipeButton] = await screen.findAllByRole("button", { name: "레시피 보기" });
  fireEvent.click(recipeButton);

  await screen.findByRole("heading", { name: "간장 두부 덮밥" });
  expect(screen.queryByRole("button", { name: "재료 등록하기" })).not.toBeInTheDocument();
  expect(screen.getAllByText(recipe.description)).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "레시피 소개" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "대체 재료 안내" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /구매하기/ })).toHaveAttribute("href", expect.stringContaining("query=%EB%8C%80%ED%8C%8C"));

  fireEvent.click(screen.getByRole("button", { name: /레시피 저장/ }));
  expect(await screen.findByRole("button", { name: /저장됨/ })).toBeInTheDocument();
});
