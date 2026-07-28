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

  it("헤더, 섹션 제목, 업데이트된 필드 문구를 렌더링한다", () => {
    renderRegisterPage();

    expect(
      screen.getByRole("heading", { name: "할 일 등록", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("필요한 정보만 입력해 주세요.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "할 일", level: 2 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "일정", level: 2 })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "예상되는 회피 이유", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("제목")).toBeInTheDocument();
    expect(screen.getByLabelText("할 일 유형")).toBeInTheDocument();
    expect(screen.getByLabelText("시작 예정 시간 (선택)")).toBeInTheDocument();
    expect(screen.getByLabelText("마감까지 D-day")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "할 일 등록하기" })).toBeInTheDocument();
    expect(screen.getByText("비워두면 지금부터 바로 시작돼요.")).toBeInTheDocument();
    expect(screen.getByText("간단하게 입력해도 괜찮아요.")).toBeInTheDocument();
  });

  it("custom reason을 선택하면 조건부 입력창을 보여준다", () => {
    renderRegisterPage();

    expect(screen.queryByLabelText("회피 이유 직접 입력")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "예상되는 회피 이유" }), {
      target: { value: "custom" },
    });

    expect(screen.getByLabelText("회피 이유 직접 입력")).toBeInTheDocument();
  });

  it("제목이 비어있으면 제출을 막고 에러 메시지를 보여준다", () => {
    renderRegisterPage();
    fireEvent.change(screen.getByLabelText("마감까지 D-day"), {
      target: { value: "3" },
    });

    fireEvent.click(screen.getByRole("button", { name: "할 일 등록하기" }));

    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.getByText("제목을 입력해주세요.")).toBeInTheDocument();
    expect(screen.getByLabelText("제목")).toHaveAttribute("aria-invalid", "true");
  });

  it("D-day가 비어있으면 제출을 막고 에러 메시지를 보여준다", () => {
    renderRegisterPage();
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "과제 제출하기" },
    });

    fireEvent.click(screen.getByRole("button", { name: "할 일 등록하기" }));

    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.getByText("마감까지 D-day를 입력해주세요.")).toBeInTheDocument();
    expect(screen.getByLabelText("마감까지 D-day")).toHaveAttribute("aria-invalid", "true");
  });

  it("연타해도 등록 요청은 한 번만 보내고 성공 시 홈으로 이동한다", async () => {
    let resolveRequest;
    const request = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    apiFetch.mockReturnValue(request);
    renderRegisterPage();
    fillMinimumValidForm();

    const submitButton = screen.getByRole("button", { name: "할 일 등록하기" });
    fireEvent.click(submitButton);

    expect(screen.getByRole("button", { name: "등록 중..." })).toBeDisabled();

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

    fireEvent.click(screen.getByRole("button", { name: "할 일 등록하기" }));

    await waitFor(() => {
      expect(
        screen.getByText("할일 등록에 실패했어요. 다시 시도해주세요."),
      ).toBeInTheDocument();
    });

    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "할 일 등록하기" })).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "할일 등록에 실패했어요. 다시 시도해주세요.",
    );
    expect(screen.getByLabelText("제목")).toHaveValue("과제 제출하기");
    expect(screen.getByLabelText("마감까지 D-day")).toHaveValue(3);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});
