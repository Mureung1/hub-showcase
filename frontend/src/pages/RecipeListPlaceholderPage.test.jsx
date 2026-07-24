import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

import { AuthContext } from "../auth/authContext";
import RecipeListPlaceholderPage from "./RecipeListPlaceholderPage";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RecipeListPlaceholderPage", () => {
  it("저장 후 목록에서 성공 상태를 알린다", async () => {
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
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/recipes",
              state: { createdRecipeId: "recipe-id" },
            },
          ]}
        >
          <RecipeListPlaceholderPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(
      screen.getByText("레시피를 저장했습니다."),
    ).toHaveAttribute("role", "status");
    expect(
      await screen.findByText("아직 레시피가 없습니다."),
    ).toBeInTheDocument();
  });
});
