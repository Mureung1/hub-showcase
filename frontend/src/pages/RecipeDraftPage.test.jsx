import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router";
import { AuthContext } from "../auth/authContext";
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function SavedRecipeResult() {
  const { state } = useLocation();

  return <p>저장됨: {state?.createdRecipeId}</p>;
}

function renderDraftPage() {
  const user = {
    getIdToken: vi.fn().mockResolvedValue("firebase-token"),
  };

  render(
    <AuthContext.Provider value={{ user }}>
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
          <Route path="/recipes" element={<SavedRecipeResult />} />
          <Route path="/recipes/draft" element={<RecipeDraftPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  return { user };
}

describe("RecipeDraftPage", () => {
  it("전달받은 초안과 경고를 편집 폼에 표시하고 취소하면 입력 화면으로 돌아간다", () => {
    renderDraftPage();

    expect(screen.getByLabelText("음식 이름")).toHaveValue("김치찌개");
    expect(
      screen.getByText("음식 이름을 확인해주세요."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.getByText("레시피 입력 화면")).toBeInTheDocument();
  });

  it("저장 중 중복 요청을 차단하고 생성된 레시피 ID를 목록 이동 상태로 보존한다", async () => {
    let resolveResponse;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveResponse = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { user } = renderDraftPage();

    fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    const pendingButton = screen.getByRole("button", {
      name: "저장 중…",
    });
    expect(pendingButton).toBeDisabled();

    fireEvent.click(pendingButton);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(user.getIdToken).toHaveBeenCalledOnce();

    resolveResponse(
      new Response(
        JSON.stringify({
          data: {
            id: "recipe-id",
            type: "OWNED",
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    expect(await screen.findByText("저장됨: recipe-id")).toBeInTheDocument();
  });

  it.each([
    [
      "서버 검증",
      () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                code: "VALIDATION_ERROR",
                message: "입력값을 확인해 주세요.",
              },
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
    ],
    ["네트워크", () => Promise.reject(new TypeError("network failure"))],
  ])("%s 실패 후 오류와 편집값을 유지한다", async (_label, response) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(response));
    renderDraftPage();
    const titleInput = screen.getByLabelText("음식 이름");

    fireEvent.change(titleInput, {
      target: { value: "수정한 김치찌개" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

    expect(await screen.findByRole("alert")).not.toBeEmptyDOMElement();
    expect(titleInput).toHaveValue("수정한 김치찌개");
    expect(
      screen.getByRole("button", { name: "저장하기" }),
    ).toBeEnabled();
  });
});
