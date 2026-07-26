import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { AuthContext } from "../auth/authContext";
import RecipeListPlaceholderPage from "./RecipeListPlaceholderPage";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RecipeListPlaceholderPage", () => {
  it("빈 레시피 목록을 알린다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const user = {
      displayName: "요리사",
      getIdToken: vi.fn().mockResolvedValue("firebase-token"),
    };

    render(
      <AuthContext.Provider value={{ user }}>
        <MemoryRouter initialEntries={["/recipes"]}>
          <RecipeListPlaceholderPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(
      await screen.findByText("아직 레시피가 없습니다."),
    ).toBeInTheDocument();
  });

  it("레시피 목록 카드로 해당 상세 경로를 연다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "recipe-id",
                type: "OWNED",
                title: "김치찌개",
                description: "돼지고기를 넣은 김치찌개",
                source: null,
                receivedInfo: null,
                createdAt: "2026-07-13T12:30:00.000Z",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );
    const user = {
      displayName: "요리사",
      getIdToken: vi.fn().mockResolvedValue("firebase-token"),
    };

    render(
      <AuthContext.Provider value={{ user }}>
        <MemoryRouter initialEntries={["/recipes"]}>
          <Routes>
            <Route
              path="/recipes"
              element={<RecipeListPlaceholderPage />}
            />
            <Route
              path="/recipes/:recipeId"
              element={<h1>레시피 상세</h1>}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    fireEvent.click(
      await screen.findByRole("link", { name: /김치찌개/ }),
    );

    expect(
      screen.getByRole("heading", { name: "레시피 상세" }),
    ).toBeInTheDocument();
  });

  it("상세 경로에서 서버의 핵심 조리 정보를 오른쪽 책 페이지에 표시한다", async () => {
    const recipeSummary = {
      id: "recipe-id",
      type: "EXTERNAL",
      title: "김치찌개",
      description: "돼지고기를 넣은 김치찌개",
      source: {
        url: "https://example.com/kimchi-stew",
        title: "김치찌개 원본",
        author: "요리 연구가",
      },
      receivedInfo: null,
      createdAt: "2026-07-13T12:30:00.000Z",
    };
    const recipeDetail = {
      ...recipeSummary,
      ownerId: "user-id",
      servings: "2인분",
      cookingTimeMinutes: 30,
      ingredients: [
        { name: "김치", amount: "200", unit: "g", order: 1 },
      ],
      steps: [
        { order: 1, description: "김치를 볶는다." },
      ],
      memo: null,
      updatedAt: "2026-07-13T12:30:00.000Z",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((path) =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              data:
                path === "/api/recipes/recipe-id"
                  ? recipeDetail
                  : [recipeSummary],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      ),
    );
    const user = {
      displayName: "요리사",
      getIdToken: vi.fn().mockResolvedValue("firebase-token"),
    };

    render(
      <AuthContext.Provider value={{ user }}>
        <MemoryRouter initialEntries={["/recipes/recipe-id"]}>
          <Routes>
            <Route
              path="/recipes/:recipeId"
              element={<RecipeListPlaceholderPage />}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    const detailRegion = await screen.findByRole("region", {
      name: "레시피 상세",
    });

    expect(
      within(detailRegion).getByRole("heading", {
        name: "김치찌개",
      }),
    ).toBeInTheDocument();
    expect(
      within(detailRegion).getByText("돼지고기를 넣은 김치찌개"),
    ).toBeInTheDocument();
    expect(within(detailRegion).getByText("2인분")).toBeInTheDocument();
    expect(within(detailRegion).getByText(/30분/)).toBeInTheDocument();
    expect(within(detailRegion).getByText("김치")).toBeInTheDocument();
    expect(
      within(detailRegion).getByText("김치를 볶는다."),
    ).toBeInTheDocument();
    expect(
      within(detailRegion).getByRole("link", {
        name: "김치찌개 원본",
      }),
    ).toHaveAttribute(
      "href",
      "https://example.com/kimchi-stew",
    );
  });

  it("상세 응답을 기다리는 동안 로딩 상태를 알린다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((path) => {
        if (path === "/api/recipes/recipe-id") {
          return new Promise(() => {});
        }

        return Promise.resolve(
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }),
    );
    const user = {
      displayName: "요리사",
      getIdToken: vi.fn().mockResolvedValue("firebase-token"),
    };

    render(
      <AuthContext.Provider value={{ user }}>
        <MemoryRouter initialEntries={["/recipes/recipe-id"]}>
          <Routes>
            <Route
              path="/recipes/:recipeId"
              element={<RecipeListPlaceholderPage />}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(
      await screen.findByText(
        "레시피 상세를 불러오는 중입니다.",
      ),
    ).toHaveAttribute("role", "status");
  });

  it("상세 조회 오류를 알리고 목록 복귀를 제공한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((path) =>
        Promise.resolve(
          path === "/api/recipes/recipe-id"
            ? new Response(
                JSON.stringify({
                  error: {
                    code: "RECIPE_NOT_FOUND",
                    message: "레시피를 찾을 수 없습니다.",
                  },
                }),
                {
                  status: 404,
                  headers: {
                    "Content-Type": "application/json",
                  },
                },
              )
            : new Response(JSON.stringify({ data: [] }), {
                status: 200,
                headers: {
                  "Content-Type": "application/json",
                },
              }),
        ),
      ),
    );
    const user = {
      displayName: "요리사",
      getIdToken: vi.fn().mockResolvedValue("firebase-token"),
    };

    render(
      <AuthContext.Provider value={{ user }}>
        <MemoryRouter initialEntries={["/recipes/recipe-id"]}>
          <Routes>
            <Route
              path="/recipes/:recipeId"
              element={<RecipeListPlaceholderPage />}
            />
            <Route path="/recipes" element={<p>레시피 목록</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("레시피를 찾을 수 없습니다.");
    fireEvent.click(
      within(alert).getByRole("link", {
        name: "목록으로 돌아가기",
      }),
    );
    expect(screen.getByText("레시피 목록")).toBeInTheDocument();
  });

  it("선택 정보와 목록이 비어 있어도 상세를 안전하게 표시하고 목록으로 돌아간다", async () => {
    const recipeSummary = {
      id: "recipe-id",
      type: "OWNED",
      title: "간단한 달걀 요리",
      description: null,
      source: null,
      receivedInfo: null,
      createdAt: "2026-07-13T12:30:00.000Z",
    };
    const recipeDetail = {
      ...recipeSummary,
      ownerId: "user-id",
      servings: null,
      cookingTimeMinutes: null,
      ingredients: [],
      steps: [],
      memo: null,
      updatedAt: "2026-07-13T12:30:00.000Z",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((path) =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              data:
                path === "/api/recipes/recipe-id"
                  ? recipeDetail
                  : [recipeSummary],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      ),
    );
    const user = {
      displayName: "요리사",
      getIdToken: vi.fn().mockResolvedValue("firebase-token"),
    };

    render(
      <AuthContext.Provider value={{ user }}>
        <MemoryRouter initialEntries={["/recipes/recipe-id"]}>
          <Routes>
            <Route
              path="/recipes/:recipeId"
              element={<RecipeListPlaceholderPage />}
            />
            <Route path="/recipes" element={<p>레시피 목록</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    const detailRegion = await screen.findByRole("region", {
      name: "레시피 상세",
    });

    expect(
      within(detailRegion).getByText("등록된 재료가 없습니다."),
    ).toBeInTheDocument();
    expect(
      within(detailRegion).getByText(
        "등록된 조리 순서가 없습니다.",
      ),
    ).toBeInTheDocument();
    expect(
      within(detailRegion).queryByRole("heading", {
        name: "출처",
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(detailRegion).getByRole("link", { name: "← 목록" }),
    );
    expect(screen.getByText("레시피 목록")).toBeInTheDocument();
  });

  it("레시피 추가 화면에서 레시피북 위에 전달 코드 모달을 열고 닫는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const user = {
      displayName: "요리사",
      getIdToken: vi.fn().mockResolvedValue("firebase-token"),
    };

    render(
      <AuthContext.Provider value={{ user }}>
        <MemoryRouter initialEntries={["/recipes/new"]}>
          <Routes>
            <Route
              path="/recipes"
              element={<RecipeListPlaceholderPage />}
            />
            <Route
              path="/recipes/new"
              element={<RecipeListPlaceholderPage />}
            />
            <Route
              path="/transfer-invitations"
              element={<RecipeListPlaceholderPage />}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "전달받은 레시피가 있나요? 코드로 불러오기",
      }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "전달 코드로 레시피 받기",
    });

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(
      within(dialog).getByLabelText("전달 코드"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "코드 확인" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("나만의 레시피북")).not.toHaveLength(0);

    fireEvent.click(
      within(dialog).getByRole("button", { name: "닫기" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
