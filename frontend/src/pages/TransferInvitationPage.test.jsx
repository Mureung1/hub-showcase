import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthContext } from "../auth/authContext";
import TransferInvitationPage from "./TransferInvitationPage";

const preview = {
  invitationId: "invitation-1",
  recipe: {
    title: "엄마의 김치찌개",
    description: "집에서 먹던 김치찌개",
    servings: 2,
    cookingTimeMinutes: 30,
    ingredients: [{ name: "김치", amount: "300", unit: "g" }],
    steps: [{ order: 1, description: "김치를 볶는다." }],
    source: null,
  },
  originalOwner: {
    name: "김민지",
    profileImageUrl: null,
  },
  expiresAt: "2026-08-01T00:00:00.000Z",
  canReshare: false,
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderPage(initialPath) {
  const user = {
    getIdToken: vi.fn().mockResolvedValue("firebase-token"),
  };

  render(
    <AuthContext.Provider value={{ user, isLoading: false }}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/transfer-invitations"
            element={<TransferInvitationPage />}
          />
          <Route
            path="/transfer-invitations/:linkToken"
            element={<TransferInvitationPage />}
          />
          <Route path="/recipes" element={<div>레시피 목록</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  return user;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TransferInvitationPage", () => {
  it("링크로 초대를 조회하고 공통 미리보기를 표시한 뒤 거절하면 목록으로 돌아간다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: preview }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPage("/transfer-invitations/link-token");

    expect(
      screen.getByText("전달받은 레시피를 불러오는 중입니다."),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", { name: "엄마의 김치찌개" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("김민지님이 전달한 레시피"),
    ).toBeInTheDocument(); expect(
      screen.getByText(/다시 공유할 수 없습니다/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수락" })).toBeInTheDocument();

    const [requestPath, requestOptions] = fetchMock.mock.calls[0];

    expect(requestPath).toBe(
      "/api/transfer-invitations/by-link/link-token",
    );
    expect(requestOptions.method).toBe("GET");
    expect(requestOptions.headers.get("Authorization")).toBe(
      "Bearer firebase-token",
    );

    fireEvent.click(screen.getByRole("button", { name: "거절" }));

    expect(await screen.findByText("레시피 목록")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("코드 입력 검증, 중복 제출 방지, 오류 후 입력 유지와 재시도를 한 흐름으로 처리한다", async () => {
    let resolveFirstRequest;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstRequest = resolve;
          }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: preview }));
    vi.stubGlobal("fetch", fetchMock);

    const user = renderPage("/transfer-invitations");
    const input = screen.getByLabelText("전달 코드");
    const submitButton = screen.getByRole("button", { name: "코드 확인" });
    const form = submitButton.closest("form");

    fireEvent.click(submitButton);

    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent("초대 코드를 입력해 주세요.");
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "ABCD-1234" } });
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("button", { name: "코드 확인 중…" }),
    ).toBeDisabled();

    resolveFirstRequest(
      jsonResponse(
        {
          error: {
            code: "TRANSFER_INVITATION_NOT_FOUND",
            message: "초대를 찾을 수 없습니다.",
          },
        },
        404,
      ),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "유효하지 않은 초대 코드입니다.",
    );
    expect(input).toHaveValue("ABCD-1234");
    expect(input).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("transfer-code-error"),
    );
    expect(user.getIdToken).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "코드 확인" }));

    expect(
      await screen.findByRole("heading", { name: "엄마의 김치찌개" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(user.getIdToken).toHaveBeenCalledTimes(2);

    const [requestPath, requestOptions] = fetchMock.mock.calls[0];

    expect(requestPath).toBe("/api/transfer-invitations/by-code");
    expect(requestOptions.method).toBe("POST");
    expect(requestOptions.headers.get("Authorization")).toBe(
      "Bearer firebase-token",
    );
    expect(requestOptions.body).toBe(
      JSON.stringify({ invitationCode: "ABCD-1234" }),
    );
  });

  it.each([
    [
      "이미 사용된",
      "TRANSFER_INVITATION_USED",
      "이미 사용된 전달 초대입니다.",
    ],
    [
      "만료된",
      "TRANSFER_INVITATION_EXPIRED",
      "만료된 전달 초대입니다.",
    ],
  ])("%s 코드 오류를 입력 근처에 안내한다", async (_, code, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { code, message } }, 409),
      ),
    );

    renderPage("/transfer-invitations");
    const input = screen.getByLabelText("전달 코드");

    fireEvent.change(input, { target: { value: "ABCD-1234" } });
    fireEvent.click(screen.getByRole("button", { name: "코드 확인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(input).toHaveValue("ABCD-1234");
    expect(input).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("transfer-code-error"),
    );
  });

  it.each([
    [
      "유효하지 않은 링크",
      "TRANSFER_INVITATION_NOT_FOUND",
      "유효하지 않은 전달 링크입니다.",
    ],
    [
      "이미 사용된 링크",
      "TRANSFER_INVITATION_USED",
      "이미 사용된 전달 초대입니다.",
    ],
    [
      "만료된 링크",
      "TRANSFER_INVITATION_EXPIRED",
      "만료된 전달 초대입니다.",
    ],
  ])("%s 오류를 안내한다", async (_, code, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { code, message } }, 409),
      ),
    );

    renderPage("/transfer-invitations/link-token");

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });
});
