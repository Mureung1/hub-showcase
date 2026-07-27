import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { AuthContext } from "../auth/authContext";
import RecipeEditPage from "./RecipeEditPage";

const baseRecipeDetail = {
  id: "recipe-id",
  ownerId: "user-id",
  type: "OWNED",
  title: "김치찌개",
  description: "돼지고기를 넣은 김치찌개",
  servings: "2인분",
  cookingTimeMinutes: 30,
  ingredients: [
    { name: "김치", amount: "200", unit: "g", order: 1 },
  ],
  steps: [{ order: 1, description: "김치를 볶는다." }],
  source: null,
  memo: "개인 메모",
  receivedInfo: null,
  createdAt: "2026-07-27T09:00:00.000Z",
  updatedAt: "2026-07-27T09:00:00.000Z",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function RecipeDetailDestination() {
  const { recipeId } = useParams();

  return <p>상세: {recipeId}</p>;
}

function renderEditPage({
  recipeDetail = baseRecipeDetail,
  detailResponse = () =>
    Promise.resolve(
      new Response(JSON.stringify({ data: recipeDetail }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  updateResponse = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          data: {
            id: recipeDetail.id,
            type: recipeDetail.type,
            updatedAt: "2026-07-27T10:00:00.000Z",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ),
} = {}) {
  const fetchMock = vi.fn().mockImplementation((path, request) => {
    if (request?.method === "PATCH") {
      return updateResponse();
    }

    return detailResponse();
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = {
    getIdToken: vi.fn().mockResolvedValue("firebase-token"),
  };

  render(
    <AuthContext.Provider value={{ user }}>
      <MemoryRouter initialEntries={["/recipes/recipe-id/edit"]}>
        <Routes>
          <Route
            path="/recipes/:recipeId/edit"
            element={<RecipeEditPage />}
          />
          <Route
            path="/recipes/:recipeId"
            element={<RecipeDetailDestination />}
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  return { fetchMock, user };
}

describe("RecipeEditPage", () => {
  it("상세 응답을 기다리는 동안 폼 대신 로딩 상태를 알린다", async () => {
    let resolveDetail;
    renderEditPage({
      detailResponse: () =>
        new Promise((resolve) => {
          resolveDetail = resolve;
        }),
    });

    expect(
      await screen.findByText("레시피를 불러오는 중입니다."),
    ).toHaveAttribute("role", "status");
    expect(screen.queryByLabelText("음식 이름")).not.toBeInTheDocument();

    resolveDetail(
      new Response(JSON.stringify({ data: baseRecipeDetail }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(await screen.findByLabelText("음식 이름")).toHaveValue(
      "김치찌개",
    );
  });

  it("상세 조회 실패를 알리고 상세 복귀 링크를 제공한다", async () => {
    renderEditPage({
      detailResponse: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                code: "RECIPE_NOT_FOUND",
                message: "레시피를 찾을 수 없습니다.",
              },
            }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
    });

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("레시피를 찾을 수 없습니다.");
    expect(
      screen.getByRole("link", { name: "상세로 돌아가기" }),
    ).toHaveAttribute("href", "/recipes/recipe-id");
    expect(screen.queryByLabelText("음식 이름")).not.toBeInTheDocument();
  });

  it.each(["OWNED", "EXTERNAL"])(
    "%s 상세를 편집 상태로 불러와 저장하고 응답 ID의 상세로 이동한다",
    async (type) => {
      const recipeDetail = {
        ...baseRecipeDetail,
        type,
        source:
          type === "EXTERNAL"
            ? {
                url: "https://example.com/recipe",
                title: "김치찌개 원본",
                author: "요리 연구가",
              }
            : null,
      };
      const { fetchMock } = renderEditPage({ recipeDetail });

      expect(
        await screen.findByRole("heading", { name: "레시피 원본 수정" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("음식 이름")).toHaveValue("김치찌개");

      fireEvent.change(screen.getByLabelText("음식 이름"), {
        target: { value: "수정한 김치찌개" },
      });
      fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

      expect(await screen.findByText("상세: recipe-id")).toBeInTheDocument();
      expect(
        fetchMock.mock.calls.filter(
          ([path, request]) =>
            path === "/api/recipes/recipe-id" &&
            request?.method === "PATCH",
        ),
      ).toHaveLength(1);
    },
  );

  it("저장 실패 후 오류와 편집값을 유지한다", async () => {
    renderEditPage({
      updateResponse: () =>
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
    });
    const titleInput = await screen.findByLabelText("음식 이름");

    fireEvent.change(titleInput, {
      target: { value: "수정 중인 김치찌개" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "입력값을 확인해 주세요.",
    );
    expect(titleInput).toHaveValue("수정 중인 김치찌개");
    expect(screen.getByRole("button", { name: "저장하기" })).toBeEnabled();
  });

  it("저장 중 중복 요청과 취소를 막고 진행 상태를 알린다", async () => {
    let resolveUpdate;
    const updateResponse = () =>
      new Promise((resolve) => {
        resolveUpdate = resolve;
      });
    const { fetchMock, user } = renderEditPage({ updateResponse });
    const saveButton = await screen.findByRole("button", {
      name: "저장하기",
    });

    fireEvent.click(saveButton);
    fireEvent.submit(saveButton.closest("form"));

    const pendingButton = screen.getByRole("button", { name: "저장 중…" });
    const cancelButton = screen.getByRole("button", { name: "취소" });
    expect(pendingButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(pendingButton.closest("form")).toHaveAttribute(
      "aria-busy",
      "true",
    );

    fireEvent.click(pendingButton);
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(
          ([, request]) => request?.method === "PATCH",
        ),
      ).toHaveLength(1);
    });
    expect(user.getIdToken).toHaveBeenCalledTimes(2);

    resolveUpdate(
      new Response(
        JSON.stringify({
          data: {
            id: "recipe-id",
            type: "OWNED",
            updatedAt: "2026-07-27T10:00:00.000Z",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    expect(await screen.findByText("상세: recipe-id")).toBeInTheDocument();
  });

  it("취소하면 수정 요청 없이 상세로 돌아간다", async () => {
    const { fetchMock } = renderEditPage();

    fireEvent.click(await screen.findByRole("button", { name: "취소" }));

    expect(screen.getByText("상세: recipe-id")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([, request]) => request?.method === "PATCH"),
    ).toHaveLength(0);
  });

  it("RECEIVED 직접 접근은 폼을 표시하지 않고 상세로 교체 이동한다", async () => {
    renderEditPage({
      recipeDetail: {
        ...baseRecipeDetail,
        type: "RECEIVED",
      },
    });

    expect(await screen.findByText("상세: recipe-id")).toBeInTheDocument();
    expect(screen.queryByLabelText("음식 이름")).not.toBeInTheDocument();
  });
});
