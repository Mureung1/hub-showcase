import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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

function renderRecipeDetail({
  type = "OWNED",
  createInvitation = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          data: {
            invitationId: "invitation-id",
            transferPath: "/transfer-invitations/link-token",
            invitationCode: "ABCD-1234",
            createdAt: "2026-07-26T14:00:00.000Z",
            expiresAt: "2026-08-02T14:00:00.000Z",
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ),
} = {}) {
  const recipeSummary = {
    id: "recipe-id",
    type,
    title: "김치찌개",
    description: null,
    source: null,
    receivedInfo: null,
    createdAt: "2026-07-26T12:30:00.000Z",
  };
  const recipeDetail = {
    ...recipeSummary,
    ownerId: "user-id",
    servings: "2인분",
    cookingTimeMinutes: 30,
    ingredients: [],
    steps: [],
    memo: null,
    updatedAt: "2026-07-26T12:30:00.000Z",
  };
  const fetchMock = vi.fn().mockImplementation((path) => {
    if (
      path ===
      "/api/recipes/recipe-id/transfer-invitations"
    ) {
      return createInvitation();
    }

    return Promise.resolve(
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
    );
  });
  vi.stubGlobal("fetch", fetchMock);

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

  return { fetchMock, user };
}

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

    const cookingModeSwitch = within(detailRegion).getByRole(
      "switch",
      { name: "조리 중 보기" },
    );
    expect(cookingModeSwitch).not.toBeChecked();

    fireEvent.click(cookingModeSwitch);

    expect(cookingModeSwitch).toBeChecked();
    expect(
      within(detailRegion).getByText("김치찌개 원본"),
    ).toBeInTheDocument();
    expect(
      within(detailRegion).queryByRole("link"),
    ).not.toBeInTheDocument();
    expect(
      within(detailRegion).queryByRole("button"),
    ).not.toBeInTheDocument();
  });

  it("전달받은 레시피 상세에 관계와 기억 정보를 표시한다", async () => {
    const receivedInfo = {
      originalOwner: {
        name: "김민지",
        profileImageUrl: null,
      },
      senderDisplayName: "엄마",
      relationshipLabel: "어머니의 레시피",
      receivedAt: "2026-07-26T12:30:00.000Z",
      canReshare: false,
    };
    const recipeSummary = {
      id: "received-recipe-id",
      type: "RECEIVED",
      title: "엄마의 김치찌개",
      description: null,
      source: null,
      receivedInfo,
      createdAt: "2026-07-26T12:30:00.000Z",
    };
    const recipeDetail = {
      ...recipeSummary,
      ownerId: "user-id",
      servings: "2인분",
      cookingTimeMinutes: 30,
      ingredients: [],
      steps: [],
      memo: "생일마다 해주시던 음식",
      updatedAt: "2026-07-26T12:30:00.000Z",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((path) =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              data:
                path === "/api/recipes/received-recipe-id"
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
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/recipes/received-recipe-id",
              state: { receivedRecipeSaved: true },
            },
          ]}
        >
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
    const memoryRegion = within(detailRegion).getByRole("region", {
      name: "전달받은 기억",
    });

    expect(within(memoryRegion).getByText("김민지")).toBeInTheDocument();
    expect(within(memoryRegion).getByText("엄마")).toBeInTheDocument();
    expect(
      within(memoryRegion).getByText("어머니의 레시피"),
    ).toBeInTheDocument();
    expect(
      within(memoryRegion).getByText("생일마다 해주시던 음식"),
    ).toBeInTheDocument();
    expect(
      within(memoryRegion).getByText(/다시 공유할 수 없습니다/),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "전달받은 레시피를 저장했습니다.",
    );

    fireEvent.click(
      within(detailRegion).getByRole("switch", {
        name: "조리 중 보기",
      }),
    );

    expect(
      within(detailRegion).getByRole("switch", {
        name: "조리 중 보기",
      }),
    ).toBeChecked();
    expect(
      within(memoryRegion).getByText("생일마다 해주시던 음식"),
    ).toBeInTheDocument();
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

  it("조리 중 보기에서 본문을 유지하고 관리 동작만 숨긴 뒤 기존 초대를 복원한다", async () => {
    const { fetchMock, user } = renderRecipeDetail();
    const detailRegion = await screen.findByRole("region", {
      name: "레시피 상세",
    });
    const cookingModeSwitch = within(detailRegion).getByRole(
      "switch",
      { name: "조리 중 보기" },
    );

    expect(cookingModeSwitch).not.toBeChecked();

    fireEvent.click(
      within(detailRegion).getByRole("button", {
        name: "전달 초대 만들기",
      }),
    );

    const linkInput = await screen.findByLabelText("전달 링크");
    const codeInput = screen.getByLabelText("초대 코드");
    const fetchCallCount = fetchMock.mock.calls.length;
    const tokenCallCount = user.getIdToken.mock.calls.length;

    fireEvent.click(cookingModeSwitch);

    const activeCookingModeSwitch = within(detailRegion).getByRole(
      "switch",
      { name: "조리 중 보기" },
    );
    expect(activeCookingModeSwitch).toBeChecked();
    expect(
      within(detailRegion).getByRole("heading", {
        name: "김치찌개",
      }),
    ).toBeInTheDocument();
    expect(
      within(detailRegion).getByText("등록된 재료가 없습니다."),
    ).toBeInTheDocument();
    expect(
      within(detailRegion).getByText(
        "등록된 조리 순서가 없습니다.",
      ),
    ).toBeInTheDocument();
    expect(
      within(detailRegion).queryByRole("region", {
        name: "전달 공유",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(detailRegion).queryByRole("link"),
    ).not.toBeInTheDocument();
    expect(
      within(detailRegion).queryByRole("button"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
    expect(user.getIdToken).toHaveBeenCalledTimes(tokenCallCount);

    fireEvent.click(activeCookingModeSwitch);

    expect(
      within(detailRegion).getByRole("switch", {
        name: "조리 중 보기",
      }),
    ).not.toBeChecked();
    expect(
      within(detailRegion).getByRole("region", {
        name: "전달 공유",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "전달 코드" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /김치찌개/ }),
    ).toBeInTheDocument();
    expect(linkInput).toHaveValue(
      `${window.location.origin}/transfer-invitations/link-token`,
    );
    expect(codeInput).toHaveValue("ABCD-1234");
    expect(fetchMock).toHaveBeenCalledTimes(fetchCallCount);
    expect(user.getIdToken).toHaveBeenCalledTimes(tokenCallCount);
  });

  it("OWNED 레시피의 전달 링크와 코드를 생성하고 복사한다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    renderRecipeDetail();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "전달 초대 만들기",
      }),
    );

    const linkInput = await screen.findByLabelText("전달 링크");
    const codeInput = screen.getByLabelText("초대 코드");
    const fullLink = `${window.location.origin}/transfer-invitations/link-token`;

    expect(linkInput).toHaveValue(fullLink);
    expect(linkInput).toHaveAttribute("readonly");
    expect(codeInput).toHaveValue("ABCD-1234");
    expect(codeInput).toHaveAttribute("readonly");
    expect(screen.getByText(/링크와 코드는 같은 초대/)).toBeInTheDocument();
    expect(screen.getByText(/한 명이 수락하면/)).toBeInTheDocument();
    expect(screen.getByText(/7일 후 만료/)).toBeInTheDocument();
    expect(screen.getByText(/생성 응답에서만/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "전달 링크 복사" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "전달 링크를 복사했습니다.",
    );
    expect(writeText).toHaveBeenLastCalledWith(fullLink);

    fireEvent.click(
      screen.getByRole("button", { name: "초대 코드 복사" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "초대 코드를 복사했습니다.",
    );
    expect(writeText).toHaveBeenLastCalledWith("ABCD-1234");
  });

  it.each(["EXTERNAL", "RECEIVED"])(
    "%s 레시피에는 전달 초대 생성 동작을 표시하지 않는다",
    async (type) => {
      renderRecipeDetail({ type });

      await screen.findByRole("region", { name: "레시피 상세" });

      expect(
        screen.queryByRole("button", {
          name: "전달 초대 만들기",
        }),
      ).not.toBeInTheDocument();
    },
  );

  it("전달 초대 생성 중 같은 틱의 중복 요청을 막는다", async () => {
    let resolveInvitation;
    const invitationResponse = new Promise((resolve) => {
      resolveInvitation = resolve;
    });
    const { fetchMock } = renderRecipeDetail({
      createInvitation: () => invitationResponse,
    });
    const createButton = await screen.findByRole("button", {
      name: "전달 초대 만들기",
    });

    fireEvent.click(createButton);
    fireEvent.click(createButton);

    expect(createButton).toBeDisabled();
    expect(createButton).toHaveAttribute("aria-busy", "true");
    expect(createButton).toHaveTextContent("생성 중");
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(
          ([path]) =>
            path ===
            "/api/recipes/recipe-id/transfer-invitations",
        ),
      ).toHaveLength(1);
    });

    resolveInvitation(
      new Response(
        JSON.stringify({
          data: {
            invitationId: "invitation-id",
            transferPath: "/transfer-invitations/link-token",
            invitationCode: "ABCD-1234",
            createdAt: "2026-07-26T14:00:00.000Z",
            expiresAt: "2026-08-02T14:00:00.000Z",
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    expect(await screen.findByLabelText("전달 링크")).toBeInTheDocument();
  });

  it.each([
    [
      403,
      "RECIPE_NOT_SHAREABLE",
      "전달할 수 없는 레시피입니다.",
    ],
    [500, "INTERNAL_SERVER_ERROR", "서버 오류가 발생했습니다."],
  ])(
    "전달 초대 생성 %i 오류 후 결과를 유지하고 재시도한다",
    async (status, code, message) => {
      let requestCount = 0;
      renderRecipeDetail({
        createInvitation: () => {
          requestCount += 1;

          if (requestCount === 2) {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  error: { code, message },
                }),
                {
                  status,
                  headers: { "Content-Type": "application/json" },
                },
              ),
            );
          }

          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  invitationId: "invitation-id",
                  transferPath: "/transfer-invitations/link-token",
                  invitationCode: "ABCD-1234",
                  createdAt: "2026-07-26T14:00:00.000Z",
                  expiresAt: "2026-08-02T14:00:00.000Z",
                },
              }),
              {
                status: 201,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        },
      });
      const createButton = await screen.findByRole("button", {
        name: "전달 초대 만들기",
      });

      fireEvent.click(createButton);
      const linkInput = await screen.findByLabelText("전달 링크");
      fireEvent.click(createButton);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        message,
      );
      expect(linkInput).toHaveValue(
        `${window.location.origin}/transfer-invitations/link-token`,
      );
      expect(createButton).toBeEnabled();

      fireEvent.click(createButton);

      await waitFor(() => {
        expect(requestCount).toBe(3);
      });
    },
  );

  it("클립보드가 거부되어도 생성 결과를 유지한다", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(
          new Error("clipboard denied"),
        ),
      },
    });
    renderRecipeDetail();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "전달 초대 만들기",
      }),
    );
    const linkInput = await screen.findByLabelText("전달 링크");
    const codeInput = screen.getByLabelText("초대 코드");

    fireEvent.click(
      screen.getByRole("button", { name: "전달 링크 복사" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "전달 링크를 복사하지 못했습니다.",
    );
    expect(linkInput).toHaveValue(
      `${window.location.origin}/transfer-invitations/link-token`,
    );
    expect(codeInput).toHaveValue("ABCD-1234");
  });
});
