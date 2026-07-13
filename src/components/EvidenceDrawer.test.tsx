import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EvidenceDrawer from "./EvidenceDrawer";

const evidence = [{
  sourceRecordId: "source-1",
  sourceTitle: "회의",
  quote: "확인",
}];

describe("EvidenceDrawer external backlinks", () => {
  it("shows an external URL only for one unambiguous containing segment", () => {
    render(
      <EvidenceDrawer
        evidence={evidence}
        segments={[segment("segment-1", "결정 내용을 확인합니다.", "https://example.test/1")]}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("link", { name: "외부 원문 위치 열기" })).toHaveAttribute(
      "href",
      "https://example.test/1",
    );
    expect(screen.getByLabelText("스냅숏 검증 1/1 · 인용 1개")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("외부 원본 위치 1개");
  });

  it("does not guess when the same quote appears in multiple segments", () => {
    render(
      <EvidenceDrawer
        evidence={evidence}
        segments={[
          segment("segment-1", "첫 번째 확인", "https://example.test/1"),
          segment("segment-2", "두 번째 확인", "https://example.test/2"),
        ]}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole("link", { name: "외부 원문 위치 열기" })).not.toBeInTheDocument();
    expect(screen.getByText("확인")).toBeInTheDocument();
  });

  it("traps keyboard focus, closes with Escape, and restores the opener", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);

    const opener = screen.getByRole("button", { name: "근거 열기" });
    await user.click(opener);

    const close = screen.getByRole("button", { name: "닫기" });
    const sourceLink = screen.getByRole("link", { name: "외부 원문 위치 열기" });
    expect(close).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(sourceLink).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "분석 근거" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

function DrawerHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>근거 열기</button>
      <EvidenceDrawer
        evidence={open ? evidence : null}
        segments={[segment("segment-keyboard", "결정 내용을 확인합니다.", "https://example.test/source")]}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function segment(id: string, text: string, sourceUrl: string) {
  return {
    id,
    sourceRecordId: "source-1",
    ordinal: 0,
    speaker: "민지",
    text,
    occurredAt: "2026-07-11T00:00:00Z",
    externalId: id,
    sourceUrl,
  };
}
