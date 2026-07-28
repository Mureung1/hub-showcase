import type { ReflectionDraft } from "@ptop/contracts";
import { ReflectionDraftPersistence } from "./reflection.persistence";
import {
  InvalidReflectionDraftError,
  ReflectionService,
} from "./reflection.service";

const validDraft: ReflectionDraft = {
  motivation: "프로젝트를 빠르게 정리하고 싶었습니다.",
  role: "프론트엔드 구현을 맡았습니다.",
  memorableProblem: "분석 결과를 사용자 경험과 연결하는 일이 어려웠습니다.",
  postAnalysisReflection: "",
  attempts: "",
  improvement: "",
  customChallengeTitle: "",
  customChallengeNote: "",
  selectedChallengeTitles: ["분석 결과 연결"],
  challengeAnswers: {
    "분석 결과 연결": {
      context: "결과 화면이 바로 이동하면 회고가 끊겼습니다.",
      decision: "저장 후 결과를 확인하는 흐름을 선택했습니다.",
      contribution: "화면 흐름과 API 계약을 직접 정리했습니다.",
    },
  },
};

describe("ReflectionService", () => {
  it("saves a valid reflection draft for an analysis result", async () => {
    const persistence = {
      save: jest.fn().mockResolvedValue({
        analysisResultId: "analysis-id",
        draft: validDraft,
        savedAt: "2026-07-22T09:00:00.000Z",
      }),
      find: jest.fn().mockResolvedValue(null),
    };
    const service = new ReflectionService(
      persistence as unknown as ReflectionDraftPersistence,
    );

    await expect(service.save("analysis-id", validDraft)).resolves.toEqual(
      expect.objectContaining({ analysisResultId: "analysis-id", draft: validDraft }),
    );
    expect(persistence.save).toHaveBeenCalledWith("analysis-id", validDraft, null);
  });

  it("stores the alignment between the reflection and challenge candidates", async () => {
    const reflectionAnalysis = {
      alignment: "matched" as const,
      matchedChallengeTitle: "분석 결과 연결",
      matchedChallengeEvidence: [],
      message: "회고와 후보가 연결되었습니다.",
      portfolioSummary: "분석 흐름을 개선했습니다.",
      requiresUserConfirmation: false,
    };
    const persistence = {
      save: jest.fn().mockResolvedValue({
        analysisResultId: "analysis-id",
        draft: validDraft,
        savedAt: "2026-07-22T09:00:00.000Z",
        reflectionAnalysis,
      }),
    };
    const alignmentAnalyzer = {
      analyze: jest.fn().mockResolvedValue(reflectionAnalysis),
    };
    const service = new ReflectionService(
      persistence as unknown as ReflectionDraftPersistence,
      alignmentAnalyzer as never,
    );
    const candidates = [
      {
        title: "분석 결과 연결",
        summary: "분석 결과를 연결했습니다.",
        background: null,
        problem: null,
        solution: null,
        technicalChallenge: "분석 흐름",
        whyItMatters: "회고에 활용",
        confidence: "medium" as const,
        requiresUserConfirmation: true,
        evidence: [],
      },
    ];

    await expect(service.save("analysis-id", validDraft, candidates)).resolves.toMatchObject({
      reflectionAnalysis,
    });
    expect(alignmentAnalyzer.analyze).toHaveBeenCalledWith(validDraft, candidates);
    expect(persistence.save).toHaveBeenCalledWith("analysis-id", validDraft, reflectionAnalysis);
  });

  it("rejects drafts with more than one selected challenge before calling persistence", async () => {
    const persistence = { save: jest.fn() };
    const service = new ReflectionService(
      persistence as unknown as ReflectionDraftPersistence,
    );

    await expect(
      service.save("analysis-id", { ...validDraft, selectedChallengeTitles: ["a", "b"] }),
    ).rejects.toBeInstanceOf(InvalidReflectionDraftError);
    expect(persistence.save).not.toHaveBeenCalled();
  });

  it("rejects an empty analysis result id", async () => {
    const persistence = { save: jest.fn() };
    const service = new ReflectionService(
      persistence as unknown as ReflectionDraftPersistence,
    );

    await expect(service.save(" ", validDraft)).rejects.toBeInstanceOf(
      InvalidReflectionDraftError,
    );
  });

  it("loads an existing reflection draft", async () => {
    const persistence = {
      find: jest.fn().mockResolvedValue({
        analysisResultId: "analysis-id",
        draft: validDraft,
        savedAt: "2026-07-22T09:00:00.000Z",
      }),
    };
    const service = new ReflectionService(
      persistence as unknown as ReflectionDraftPersistence,
    );

    await expect(service.find("analysis-id")).resolves.toEqual(
      expect.objectContaining({ analysisResultId: "analysis-id", draft: validDraft }),
    );
    expect(persistence.find).toHaveBeenCalledWith("analysis-id");
  });
});
