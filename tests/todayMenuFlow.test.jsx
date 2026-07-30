// @vitest-environment jsdom

import { afterEach, expect, test } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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

test("서비스 소개 탭에서 핵심 가치와 시작 동선을 제공한다", async () => {
  const requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(url);
    if (url === "/api/ingredients") return new Response(JSON.stringify({ ingredients: [] }));
    throw new Error(`Unexpected request: ${url}`);
  };

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "서비스 소개" }));

  expect(screen.getByRole("heading", { name: /냉장고 속 재료를\s*오늘의 한 끼로/ })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "재료를 한눈에" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "먼저 먹을 것부터" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "있는 재료로 한 끼" })).toBeInTheDocument();
  expect(requestedUrls).not.toContain("/api/recommendations");

  fireEvent.click(screen.getByRole("button", { name: "내 냉장고 채우기" }));
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "재료 추가" })).toBeInTheDocument();
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
  expect(screen.getAllByRole("link", { name: "대파 구매하기" })).toHaveLength(3);
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
  const recipeToolbar = screen.getByRole("toolbar", { name: "레시피 작업" });
  expect(within(recipeToolbar).getByRole("button", { name: "← 오늘의 메뉴" })).toBeInTheDocument();
  expect(within(recipeToolbar).getByRole("button", { name: /레시피 저장/ })).toBeInTheDocument();
  expect(within(recipeToolbar).getByRole("button", { name: "✓ 이 레시피로 요리했어요" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "레시피 소개" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "대체 재료 안내" })).toBeInTheDocument();
  expect(screen.getByText("양파").closest(".substitution-tile")).toHaveTextContent("대파");
  expect(screen.getByRole("heading", { name: "영양 구성" }).closest(".recipe-detail-section"))
    .toHaveClass("nutrition");
  expect(screen.getByRole("link", { name: /구매하기/ })).toHaveAttribute("href", expect.stringContaining("query=%EB%8C%80%ED%8C%8C"));

  fireEvent.click(screen.getByRole("button", { name: /레시피 저장/ }));
  expect(await screen.findByRole("button", { name: /저장됨/ })).toBeInTheDocument();
});

test("인스턴트와 가공식품 조합을 선택하면 코칭 후 상세로 이동한다", async () => {
  const instantProcessedRecipe = {
    ...recipe,
    id: "recipe-spam-ramen",
    fingerprint: "e".repeat(64),
    name: "스팸 김치라면",
    requiredIngredients: [
      { name: "라면", amount: 1, unit: "개" },
      { name: "스팸", amount: 0.5, unit: "캔" },
      { name: "계란", amount: 1, unit: "개" },
    ],
    missingIngredients: ["계란"],
  };
  globalThis.fetch = async (url) => {
    if (url === "/api/ingredients") return new Response(JSON.stringify({ ingredients: [] }));
    if (url === "/api/recommendations") return new Response(JSON.stringify({
      recipes: [instantProcessedRecipe],
      meta: { source: "gemini", maxRecipes: 15, batchNumber: 1, maxBatches: 5 },
    }));
    throw new Error(`Unexpected request: ${url}`);
  };

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "레시피 추천" }));

  const recipeHeading = await screen.findByRole("heading", { name: "스팸 김치라면" });
  const recipeCard = recipeHeading.closest("article");
  expect(within(recipeCard).getByRole("link", { name: "계란 구매하기" })).toHaveAttribute(
    "href",
    expect.stringContaining("query=%EA%B3%84%EB%9E%80"),
  );
  fireEvent.click(within(recipeCard).getByRole("button", { name: "레시피 보기" }));

  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "조금 더 든든하게 먹어볼까요?" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "원래 선택 계속하기" }));
  expect(await screen.findByRole("heading", { name: "스팸 김치라면" })).toBeInTheDocument();
});

test("요리 완료를 확인하면 레시피 사용량만큼 보유 재료를 차감한다", async () => {
  let consumedRequest = null;
  let tofuQuantity = 2;
  const tofuRow = () => ({
    id: "ingredient-tofu",
    name: "두부",
    category: "tofu",
    subcategory: null,
    tags: ["nutrition:protein"],
    quantity: tofuQuantity,
    unit: "모",
    quantity_mode: "exact",
    storage: "fridge",
    expiration_type: "absolute",
    expiration_date: "2026-07-30",
    shelf_life_days: null,
    stored_at: "2026-07-27",
    is_staple: false,
    is_instant: false,
    is_prepared: false,
    icon: "◻️",
    memo: "",
  });
  globalThis.fetch = async (url, options = {}) => {
    if (url === "/api/ingredients" && !options.method) {
      return new Response(JSON.stringify({ ingredients: [tofuRow()] }));
    }
    if (url === "/api/recommendations") return new Response(JSON.stringify({
      recipes: [recipe],
      meta: { source: "gemini", maxRecipes: 15, batchNumber: 1, maxBatches: 5 },
    }));
    if (url === "/api/ingredients/consume" && options.method === "POST") {
      consumedRequest = JSON.parse(options.body);
      tofuQuantity = 1;
      return new Response(JSON.stringify({
        consumed: [{
          id: "ingredient-tofu",
          name: "두부",
          amount: 1,
          unit: "개",
          remainingQuantity: 1,
          removed: false,
        }],
      }));
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  render(<App />);
  expect(await screen.findByRole("button", { name: "재료 수정" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "모두 사용" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /메뉴 열기/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "레시피 추천" }));
  fireEvent.click(await screen.findByRole("button", { name: "레시피 보기" }));
  await screen.findByRole("heading", { name: "간장 두부 덮밥" });
  fireEvent.click(screen.getByRole("button", { name: "✓ 이 레시피로 요리했어요" }));

  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: /두부/ })).toBeChecked();
  expect(screen.getByText("남음 1개")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "1개 재료 차감하기" }));

  await screen.findByRole("button", { name: "✓ 재료 차감 완료" });
  expect(consumedRequest).toEqual({
    items: [{ id: "ingredient-tofu", amount: 1, unit: "개" }],
  });
});
