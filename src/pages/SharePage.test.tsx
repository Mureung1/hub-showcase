import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleAnalysis } from "../data/sampleAnalysis";
import type { PlatformApi } from "../services/platformApi";
import type { PublicContextAnalysisResult } from "../types/platform";
import SharePage from "./SharePage";

afterEach(() => window.history.replaceState(null, "", "/"));

describe("SharePage", () => {
  it("resolves the fragment token and renders only the sanitized analysis", async () => {
    window.history.replaceState(null, "", "/share#token=share-secret-abcdefghijklmnopqrstuvwxyz123456");
    const api = apiMock();
    vi.mocked(api.resolveSharedAnalysis).mockResolvedValue({
      projectTitle: "공유 프로젝트",
      result: withoutProvider(sampleAnalysis),
      completedAt: "2026-07-11T00:00:00Z",
      expiresAt: "2026-07-18T00:00:00Z",
    });
    render(<SharePage api={api} />);

    expect(await screen.findByRole("heading", { name: "공유 프로젝트" })).toBeInTheDocument();
    expect(screen.getByText("수정 불가")).toBeInTheDocument();
    expect(screen.getByText(/원문 전체나 계정 정보를 포함하지 않는/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "참여자별 관점 차이" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "현재 확정된 결정" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "아직 열린 질문" })).toBeInTheDocument();
    expect(api.resolveSharedAnalysis).toHaveBeenCalledWith("share-secret-abcdefghijklmnopqrstuvwxyz123456");
  });

  it("rejects a fragment without a share token before calling the API", () => {
    window.history.replaceState(null, "", "/share#unrelated=value");
    const api = apiMock();
    render(<SharePage api={api} />);
    expect(screen.getByRole("alert")).toHaveTextContent("공유 토큰이 없습니다.");
    expect(api.resolveSharedAnalysis).not.toHaveBeenCalled();
  });

  it("renders expired or revoked share errors", async () => {
    window.history.replaceState(null, "", "/share#token=expired-token-abcdefghijklmnopqrstuvwxyz1234");
    const api = apiMock();
    vi.mocked(api.resolveSharedAnalysis).mockRejectedValue(new Error("공유 링크가 만료되었거나 폐기되었습니다."));
    render(<SharePage api={api} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("공유 링크가 만료되었거나 폐기되었습니다.");
  });
});

function withoutProvider(result: typeof sampleAnalysis): PublicContextAnalysisResult {
  const clone: Partial<typeof sampleAnalysis> = { ...result };
  delete clone.provider;
  return clone as PublicContextAnalysisResult;
}

function apiMock(): PlatformApi {
  return {
    getCapabilities: vi.fn().mockResolvedValue({ openaiEnabled: false }),
    listProjects: vi.fn(), createProject: vi.fn(), getProject: vi.fn(), updateProject: vi.fn(), deleteProject: vi.fn(),
    listSources: vi.fn(), createSource: vi.fn(), importContext: vi.fn(), updateSource: vi.fn(), deleteSource: vi.fn(), listSourceSegments: vi.fn(),
    listAnalysisRuns: vi.fn(), createAnalysisRun: vi.fn(), getAnalysisRun: vi.fn(), deleteAnalysisRun: vi.fn(),
    listAnalysisRunStepEvents: vi.fn().mockResolvedValue([]), listAnalysisRunAnnotations: vi.fn().mockResolvedValue([]), createAnalysisRunAnnotation: vi.fn(),
    listShareLinks: vi.fn(), createShareLink: vi.fn(), revokeShareLink: vi.fn(), resolveSharedAnalysis: vi.fn(),
  };
}
