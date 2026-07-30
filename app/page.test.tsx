// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

const savedItem = {
  id: 1,
  title: "이미지",
  summary: "여행지 풍경을 담은 이미지입니다.",
  content: "여행 사진",
  original_url: null,
  image_url: "https://storage.example/photo.jpg",
  source_platform: "manual",
  category_main: "미분류",
  category_sub: null,
  created_at: "2026-07-23T00:00:00.000Z",
};

describe("Home image input", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }));
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:image-preview"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("이미지를 선택해 미리보고 제거한 뒤 다시 선택할 수 있다", async () => {
    const { container } = render(<Home />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const image = new File(["png"], "screenshot.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [image] } });
    expect(await screen.findByAltText("선택한 이미지 미리보기")).toBeInTheDocument();
    expect(screen.getByText("screenshot.png")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이미지 제거" }));
    expect(screen.queryByAltText("선택한 이미지 미리보기")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { files: [image] } });
    expect(await screen.findByAltText("선택한 이미지 미리보기")).toBeInTheDocument();
  });

  it("지원하지 않는 파일과 5MB 초과 파일에 오류를 표시한다", async () => {
    const { container } = render(<Home />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [new File(["gif"], "photo.gif", { type: "image/gif" })] },
    });
    expect(screen.getByText(/JPEG, PNG, WebP/)).toBeInTheDocument();

    const largeFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(input, { target: { files: [largeFile] } });
    expect(screen.getByText(/최대 5MB/)).toBeInTheDocument();
  });

  it("이미지 저장 요청을 FormData로 보내고 성공 후 상태를 초기화한다", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => savedItem,
    } as Response);

    const { container } = render(<Home />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const image = new File(["jpeg"], "photo.jpg", { type: "image/jpeg" });

    fireEvent.change(input, { target: { files: [image] } });
    fireEvent.change(screen.getByPlaceholderText("링크나 텍스트를 붙여넣으세요"), {
      target: { value: "여행 사진" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const request = fetchMock.mock.calls[0][1];
    expect(request?.body).toBeInstanceOf(FormData);
    expect((request?.body as FormData).get("content")).toBe("여행 사진");
    expect((request?.body as FormData).get("image")).toBe(image);
    expect(screen.queryByAltText("선택한 이미지 미리보기")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("링크나 텍스트를 붙여넣으세요")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("이미지");
    expect(
      screen.getByRole("link", { name: /분류 결과 확인하기/ })
    ).toHaveAttribute("href", "/categories");
  });
});
