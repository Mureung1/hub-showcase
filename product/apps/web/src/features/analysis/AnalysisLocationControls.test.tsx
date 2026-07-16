import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalysisLocationControls } from "./AnalysisLocationControls";

afterEach(cleanup);

describe("AnalysisLocationControls", () => {
  it("starts movement and only confirms supported candidates", () => {
    const onStart = vi.fn();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <AnalysisLocationControls
        mode="idle"
        canConfirm={false}
        onStart={onStart}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "분석 위치 이동" }));
    expect(onStart).toHaveBeenCalledOnce();

    rerender(
      <AnalysisLocationControls
        mode="moving"
        canConfirm={false}
        onStart={onStart}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("button", { name: "이 위치에서 검색" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
