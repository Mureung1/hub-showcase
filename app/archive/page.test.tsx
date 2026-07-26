// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ArchivePage from "./page";

const archivedItem = {
  id: 1,
  title: "보관한 콘텐츠",
  summary: "보관한 콘텐츠의 요약입니다.",
  content: "https://example.com",
  original_url: "https://example.com",
  image_url: null,
  source_platform: "web",
  category_main: "콘텐츠",
  category_sub: "웹",
  is_archived: true,
  archived_at: "2026-07-26T00:00:00.000Z",
  created_at: "2026-07-23T00:00:00.000Z",
};

describe("ArchivePage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("보관 항목을 불러오고 복원하면 목록에서 제거한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [archivedItem],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...archivedItem, is_archived: false, archived_at: null }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ArchivePage />);

    expect(await screen.findByText("보관한 콘텐츠")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/api/items?archived=true"
    );

    fireEvent.click(screen.getByRole("button", { name: "복원" }));
    await waitFor(() =>
      expect(screen.getByText("아직 보관한 콘텐츠가 없어요.")).toBeInTheDocument()
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/api/items/1/archive",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ archived: false }),
      })
    );
  });
});
