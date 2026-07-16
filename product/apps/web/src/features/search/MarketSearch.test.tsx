import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MarketSearch } from "./MarketSearch";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MarketSearch", () => {
  it("distinguishes an empty query without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<MarketSearch onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(await screen.findByText("검색어를 입력해 주세요.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders an API result and returns its identifier and coordinates", async () => {
    const result = {
      result_type: "store" as const,
      id: "S1",
      name: "연남 테스트 카페",
      address: "서울 마포구 동교로 1",
      category_code: "I21201",
      category_name: "카페",
      longitude: 126.926,
      latitude: 37.566,
      market_id: "3110562",
      market_name: "연트럴파크",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ query: "연남", results: [result] }),
      }),
    );
    const onSelect = vi.fn();
    render(<MarketSearch onSelect={onSelect} />);

    fireEvent.change(screen.getByLabelText("상권 또는 점포 검색"), {
      target: { value: "연남" },
    });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    fireEvent.click(await screen.findByRole("button", { name: /연남 테스트 카페/ }));

    expect(onSelect).toHaveBeenCalledWith(result);
    expect(screen.getByLabelText("상권 또는 점포 검색")).toHaveValue("연남 테스트 카페");
  });

  it("shows a no-results state separately from an API error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ query: "없음", results: [] }) })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ query: "오류", results: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<MarketSearch onSelect={vi.fn()} />);
    const input = screen.getByLabelText("상권 또는 점포 검색");

    fireEvent.change(input, { target: { value: "없음" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    expect(await screen.findByText("검색 결과가 없습니다.")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "오류" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    expect(await screen.findByRole("alert", { name: "" })).toHaveTextContent(
      "예시 데이터로 대체하지 않습니다.",
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("검색 결과가 없습니다.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
