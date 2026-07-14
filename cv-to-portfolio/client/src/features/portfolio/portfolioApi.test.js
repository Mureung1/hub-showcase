import { describe, expect, it, vi } from "vitest";
import { createMockPortfolioApi, createPortfolioApi } from "./portfolioApi.js";

const PORTFOLIO = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "김지우",
  title: "Frontend Engineer",
  themeSlug: "minimal-clean",
  themeName: "Minimal Clean",
  html: "<!doctype html><html></html>",
  createdAt: "2026-07-14T00:00:00.000Z",
};

describe("portfolio API", () => {
  it("생성 결과를 POST로 저장한다", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ portfolio: PORTFOLIO }), { status: 201 }),
    );
    const api = createPortfolioApi({ fetchImpl });

    const result = await api.save(PORTFOLIO);

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/portfolios",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.id).toBe(PORTFOLIO.id);
  });

  it("최근 목록과 상세 결과를 조회한다", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ portfolios: [{ ...PORTFOLIO, html: undefined }] })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ portfolio: PORTFOLIO })));
    const api = createPortfolioApi({ fetchImpl });

    expect((await api.list())[0].name).toBe("김지우");
    expect((await api.get(PORTFOLIO.id)).html).toContain("<!doctype html>");
  });

  it("서버 오류 메시지를 사용자에게 전달한다", async () => {
    const api = createPortfolioApi({
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: "저장소가 구성되지 않았습니다." }), {
          status: 503,
        }),
    });

    await expect(api.list()).rejects.toThrow("저장소가 구성되지 않았습니다.");
  });
});

describe("mock portfolio API", () => {
  it("서버 없이 저장 → 목록 → 상세 조회 사이클을 수행한다", async () => {
    const api = createMockPortfolioApi();
    const saved = await api.save(PORTFOLIO);
    const list = await api.list();
    const detail = await api.get(saved.id);

    expect(list).toHaveLength(1);
    expect(list[0].html).toBeUndefined();
    expect(detail.html).toBe(PORTFOLIO.html);
  });
});
