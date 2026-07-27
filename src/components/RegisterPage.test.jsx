import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./RegisterPage.jsx";
import { apiFetch } from "../lib/api";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

function fillMinimumValidForm() {
  fireEvent.change(screen.getByLabelText("제목"), {
    target: { value: "과제 제출하기" },
  });
  fireEvent.change(screen.getByLabelText("마감까지 D-day"), {
    target: { value: "3" },
  });
}

describe("RegisterPage submission guard", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    navigateMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("제목이 비어있으면 제출을 막고 에러 메시지를 보여준다", () => {
    renderRegisterPage();
    fireEvent.change(screen.getByLabelText("마감까지 D-day"), {
      target: { value: "3" },
    });

    fireEvent.click(screen.getByRole("button", { name: "등록하고 홈으로" }));

    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.getByText("제목을 입력해주세요.")).toBeInTheDocument();
  });

  it("D-day가 비어있으면 제출을 막고 에러 메시지를 보여준다", () => {
    renderRegisterPage();
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "과제 제출하기" },
    });

    fireEvent.click(screen.getByRole("button", { name: "등록하고 홈으로" }));

    expect(apiFetch).not.toHaveBeenCalled();
    expect(
      screen.getByText("마감까지 D-day를 입력해주세요."),
    ).toBeInTheDocument();
  });

  it("연타해도 등록 요청은 한 번만 보내고 성공 시 홈으로 이동한다", async () => {
    let resolveRequest;
    const request = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    apiFetch.mockReturnValue(request);
    renderRegisterPage();
    fillMinimumValidForm();

    const submitButton = screen.getByRole("button", { name: "등록하고 홈으로" });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(submitButton).toBeDisabled();

    await act(async () => {
      resolveRequest({ data: { id: "task-1" } });
      await request;
    });

    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  it("등록 API가 실패하면 에러 메시지를 보여주고 홈으로 이동하지 않는다", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    apiFetch.mockRejectedValue(new Error("network failed"));
    renderRegisterPage();
    fillMinimumValidForm();

    fireEvent.click(screen.getByRole("button", { name: "등록하고 홈으로" }));

    await waitFor(() => {
      expect(
        screen.getByText("할일 등록에 실패했어요. 다시 시도해주세요."),
      ).toBeInTheDocument();
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "등록하고 홈으로" }),
    ).toBeEnabled();
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});
