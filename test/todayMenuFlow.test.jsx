// @vitest-environment jsdom

import { afterEach, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import App from "../src/App.jsx";

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
  globalThis.fetch = async (url) => {
    if (url === "/api/ingredients") return new Response(JSON.stringify({ ingredients: [] }));
    if (url === "/api/recommendations") return new Response(JSON.stringify({
      recipes: [recipe, { ...recipe, id: "recipe-test-2", fingerprint: "c".repeat(64), name: "두부국", dishType: "soup" }, { ...recipe, id: "recipe-test-3", fingerprint: "d".repeat(64), name: "두부 샐러드", dishType: "salad" }],
      meta: { source: "gemini", maxRecipes: 3, batchNumber: 1, maxBatches: 1 },
    }));
    throw new Error(`Unexpected request: ${url}`);
  };

  render(<App />);

  expect(screen.getByRole("button", { name: "내 냉장고" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "오늘의 메뉴" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "레시피" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "구매 추천" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "오늘의 메뉴" }));
  fireEvent.click(await screen.findAllByRole("button", { name: "레시피 보기" }).then(([button]) => button));

  await screen.findByRole("heading", { name: "간장 두부 덮밥" });
  expect(screen.getByRole("heading", { name: "레시피 소개" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "대체 재료 안내" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /구매하기/ })).toHaveAttribute("href", expect.stringContaining("query=%EB%8C%80%ED%8C%8C"));

  fireEvent.click(screen.getByRole("button", { name: /레시피 저장/ }));
  expect(await screen.findByRole("button", { name: /저장됨/ })).toBeInTheDocument();
});
