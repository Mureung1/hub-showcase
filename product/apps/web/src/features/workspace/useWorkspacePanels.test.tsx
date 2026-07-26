import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useWorkspacePanels } from "./useWorkspacePanels";

describe("useWorkspacePanels", () => {
  it("starts desktop panels open and compact panels closed", () => {
    const desktop = renderHook(() => useWorkspacePanels(false));
    const compact = renderHook(() => useWorkspacePanels(true));

    expect(desktop.result.current.filtersOpen).toBe(true);
    expect(desktop.result.current.inspectorOpen).toBe(true);
    expect(compact.result.current.filtersOpen).toBe(false);
    expect(compact.result.current.inspectorOpen).toBe(false);
  });

  it("closes the active evidence dialog with Escape", () => {
    const { result } = renderHook(() => useWorkspacePanels(false));
    act(() => result.current.setEvidenceOpen(true));

    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));

    expect(result.current.evidenceOpen).toBe(false);
  });
});
