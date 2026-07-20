import { describe, expect, it, vi } from "vitest";
import { requestAiPortfolio } from "./generateApi.js";
import { generateWithFallback } from "./generateWithFallback.js";

const input = {
  cvMarkdown: "# 김지우",
  designMarkdown: "# Minimal Clean",
};

describe("AI generate API", () => {
  it("브라우저에서 Express 생성 API만 호출한다", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ html: "<!doctype html><html></html>" })),
    );

    const html = await requestAiPortfolio({ ...input, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
    expect(html).toContain("<!doctype html>");
  });

  it("서버 오류 메시지를 생성 실패로 전달한다", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: "AI API가 구성되지 않았습니다." }), {
        status: 503,
      }),
    );

    await expect(requestAiPortfolio({ ...input, fetchImpl })).rejects.toThrow(
      "AI API가 구성되지 않았습니다.",
    );
  });

  it("상류 API 상세 오류를 사용자에게 노출하지 않는다", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ error: "provider authentication_error request_id=secret" }),
        { status: 502 },
      ),
    );

    await expect(requestAiPortfolio({ ...input, fetchImpl })).rejects.toThrow(
      "AI 생성 서버가 응답하지 않았습니다",
    );
    await expect(requestAiPortfolio({ ...input, fetchImpl })).rejects.not.toThrow(
      "request_id",
    );
  });

  it("빈 HTML 응답을 거부한다", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ html: "" })));

    await expect(requestAiPortfolio({ ...input, fetchImpl })).rejects.toThrow(
      "HTML이 없습니다",
    );
  });
});

describe("AI generation fallback", () => {
  const cv = {
    name: "김지우",
    title: "Frontend Engineer",
    contacts: [],
    summary: "소개",
    skills: [],
    experience: [],
    projects: [],
    education: [],
  };
  const theme = {
    name: "Minimal Clean",
    markdown: "# Minimal Clean",
    tokens: {
      bg: "#fff",
      surface: "#f7f8fa",
      text: "#111",
      textMuted: "#666",
      accent: "#2563eb",
      accent2: "#059669",
      border: "#ddd",
      radius: "10px",
      fontHeading: "sans-serif",
      fontBody: "sans-serif",
      googleFontHref: "",
      layout: "single-column",
      headerStyle: "centered",
    },
  };

  it("AI 실패 시 로컬 렌더러 결과와 안내를 반환한다", async () => {
    const result = await generateWithFallback({
      cv,
      cvMarkdown: "# 김지우",
      theme,
      request: vi.fn(async () => {
        throw new Error("503");
      }),
    });

    expect(result.source).toBe("fallback");
    expect(result.html).toContain("<!doctype html>");
    expect(result.notice).toContain("로컬 렌더러");
  });
});
