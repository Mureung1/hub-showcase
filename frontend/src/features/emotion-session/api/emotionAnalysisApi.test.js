import { describe, expect, it, vi } from "vitest";
import {
  createEmotionAnalysisApi
} from "./emotionAnalysisApi";

function createJsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(payload)
  };
}

describe("createEmotionAnalysisApi", () => {
  it("sends create requests to the injected base URL", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createJsonResponse({
        success: true,
        data: { emotionAnalysis: { id: "created-record" } }
      })
    );
    const api = createEmotionAnalysisApi({
      baseUrl: "http://127.0.0.1:4321/",
      fetchImpl
    });

    await expect(api.createEmotionAnalysis({ situationText: "테스트" }))
      .resolves.toEqual({ id: "created-record" });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:4321/api/emotion-analyses",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("uses the shared history limit for injected list requests", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createJsonResponse({
        success: true,
        data: { emotionAnalyses: [] }
      })
    );
    const api = createEmotionAnalysisApi({
      baseUrl: "http://test.local",
      fetchImpl
    });

    await api.listEmotionAnalyses("session-id");

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://test.local/api/emotion-analyses?sessionId=session-id&limit=20",
      { signal: undefined }
    );
  });
});
