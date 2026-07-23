import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppErrorBoundary from "./AppErrorBoundary";

function BrokenView(): never {
  throw new Error("render failed");
}

describe("AppErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children while the application is healthy", () => {
    render(<AppErrorBoundary><p>정상 화면</p></AppErrorBoundary>);

    expect(screen.getByText("정상 화면")).toBeInTheDocument();
  });

  it("shows a privacy-safe recovery screen after a render failure", () => {
    render(<AppErrorBoundary><BrokenView /></AppErrorBoundary>);

    expect(screen.getByRole("heading", { name: "화면을 안전하게 복구할 수 없습니다" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "페이지 다시 불러오기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홈으로 돌아가기" })).toHaveAttribute("href", "/");
    expect(screen.queryByText("render failed")).not.toBeInTheDocument();
  });
});
