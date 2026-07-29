import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GuestAccessPanel from "./GuestAccessPanel";

function renderPanel(overrides = {}) {
  const props = {
    mode: "anonymous",
    issuedKey: "",
    status: "idle",
    error: "",
    onCreate: vi.fn(),
    onRecover: vi.fn(),
    onUseAnonymous: vi.fn(),
    ...overrides
  };
  render(<GuestAccessPanel {...props} />);
  return props;
}

describe("GuestAccessPanel", () => {
  it("starts in anonymous mode and progressively reveals guest recovery", () => {
    renderPanel();

    expect(screen.getByText(/이 탭에서만 기록되고/)).toBeInTheDocument();
    expect(screen.queryByLabelText("기존 게스트 키")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "복구 키로 이어하기" }));

    expect(screen.getByLabelText("기존 게스트 키")).toHaveAttribute(
      "autocomplete",
      "off"
    );
    expect(screen.getByLabelText("기존 게스트 키")).toHaveAttribute(
      "spellcheck",
      "false"
    );
  });

  it("shows a newly issued key only in the active guest panel", () => {
    renderPanel({
      mode: "guest",
      issuedKey: "ABCD-EFGH-IJKL"
    });

    expect(screen.getByText("복구 키가 만들어졌어요")).toBeInTheDocument();
    expect(screen.getByText("ABCD-EFGH-IJKL")).toBeInTheDocument();
    expect(screen.getByText(/지금 한 번만 표시돼요/)).toBeInTheDocument();
  });
});

