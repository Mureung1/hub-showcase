import type { ReflectionDraft } from "@ptop/contracts";
import {
  ReflectionAlignmentAnalyzer,
  parseReflectionAlignmentResponse,
} from "./reflection.alignment";

describe("parseReflectionAlignmentResponse", () => {
  it("accepts an aligned response with a candidate title", () => {
    expect(
      parseReflectionAlignmentResponse(
        JSON.stringify({
          alignment: "matched",
          matchedChallengeTitle: "분석 결과 연결",
          message: "회고 내용이 후보와 일치합니다.",
          portfolioSummary: "분석 흐름과 사용자 경험을 연결했습니다.",
          portfolioDraft: {
            title: "분석 흐름과 사용자 경험 연결",
            technicalChallenge: "분석 근거와 회고를 하나의 결과로 연결하는 문제",
            background: "분석 결과와 회고를 하나의 흐름으로 연결해야 했습니다.",
            problem: "결과와 회고가 분리되어 경험을 포트폴리오로 정리하기 어려웠습니다.",
            solution: "분석 근거와 회고를 결합하는 흐름을 구성했습니다.",
            contribution: "분석 결과 화면과 회고 저장 흐름을 구현했습니다.",
            keyDecisions: ["초기 회고를 후보 우선순위에 반영했습니다."],
            result: "선택한 후보와 사용자의 경험을 한 화면에서 검토할 수 있게 되었습니다.",
            learnings: ["근거와 사용자 경험을 함께 검증해야 결과의 신뢰도를 높일 수 있었습니다."],
            evidenceSummary: "Pull Request #12, reflection service 구현 기록",
            requiresUserReview: false,
          },
          requiresUserConfirmation: false,
        }),
      ),
    ).toEqual({
      alignment: "matched",
      matchedChallengeTitle: "분석 결과 연결",
          message: "회고 내용이 후보와 일치합니다.",
          portfolioSummary: "분석 흐름과 사용자 경험을 연결했습니다.",
          portfolioDraft: {
            title: "분석 흐름과 사용자 경험 연결",
            technicalChallenge: "분석 근거와 회고를 하나의 결과로 연결하는 문제",
            background: "분석 결과와 회고를 하나의 흐름으로 연결해야 했습니다.",
            problem: "결과와 회고가 분리되어 경험을 포트폴리오로 정리하기 어려웠습니다.",
            solution: "분석 근거와 회고를 결합하는 흐름을 구성했습니다.",
            contribution: "분석 결과 화면과 회고 저장 흐름을 구현했습니다.",
            keyDecisions: ["초기 회고를 후보 우선순위에 반영했습니다."],
            result: "선택한 후보와 사용자의 경험을 한 화면에서 검토할 수 있게 되었습니다.",
            learnings: ["근거와 사용자 경험을 함께 검증해야 결과의 신뢰도를 높일 수 있었습니다."],
            evidenceSummary: "Pull Request #12, reflection service 구현 기록",
            requiresUserReview: false,
      },
      requiresUserConfirmation: false,
      suggestedChallenges: [],
    });
  });

  it("accepts evidence-backed challenges suggested from the reflection", () => {
    const candidate = {
      title: "분석 중 발견한 동시성 문제",
      summary: "동시 요청에서 데이터 정합성을 유지한 문제",
      background: null,
      problem: "동시 요청으로 데이터가 중복 처리될 수 있었습니다.",
      solution: "저장 흐름을 하나의 검증 단계로 정리했습니다.",
      technicalChallenge: "동시 요청의 데이터 정합성 보장",
      whyItMatters: "사용자 경험과 결과 신뢰성에 직접 영향을 줍니다.",
      confidence: "medium",
      requiresUserConfirmation: true,
      evidence: [
        {
          evidenceType: "pull_request",
          referenceId: "pr-12",
          title: "저장 흐름 정리",
          url: "https://github.com/owner/repo/pull/12",
          filePath: null,
        },
      ],
    } as const;

    expect(
      parseReflectionAlignmentResponse(
        JSON.stringify({
          alignment: "mismatched",
          matchedChallengeTitle: null,
          message: "기존 후보와 다르지만 보완 후보를 찾았습니다.",
          portfolioSummary: null,
          portfolioDraft: null,
          requiresUserConfirmation: true,
          suggestedChallenges: [candidate],
        }),
      ).suggestedChallenges,
    ).toEqual([candidate]);
  });

  it("rejects a response with an unsupported alignment", () => {
    expect(() =>
      parseReflectionAlignmentResponse(
        JSON.stringify({
          alignment: "invented",
          matchedChallengeTitle: null,
          message: "확인 필요",
          portfolioSummary: null,
          portfolioDraft: null,
          requiresUserConfirmation: true,
        }),
      ),
    ).toThrow("회고 정합성 응답을 검증할 수 없습니다.");
  });

  it("does not expose a portfolio draft when the reflection does not match", async () => {
    const analyzer = new ReflectionAlignmentAnalyzer(
      {
        generate: jest.fn().mockResolvedValue(
          JSON.stringify({
            alignment: "mismatched",
            matchedChallengeTitle: null,
            message: "회고와 후보가 다릅니다.",
            portfolioSummary: null,
            portfolioDraft: null,
            requiresUserConfirmation: true,
          }),
        ),
      },
      { get: (key: string) => (key === "AI_MODEL" ? "gpt-test" : "test-key") } as never,
    );
    const draft: ReflectionDraft = {
      motivation: "",
      role: "",
      memorableProblem: "배포 설정을 정리했습니다.",
      postAnalysisReflection: "배포 설정을 정리했습니다.",
      attempts: "",
      improvement: "",
      customChallengeTitle: "",
      customChallengeNote: "",
      selectedChallengeTitles: ["분석 흐름 개선"],
      challengeAnswers: {},
    };

    await expect(
      analyzer.analyze(draft, [
        {
          title: "분석 흐름 개선",
          summary: "분석 흐름을 개선했습니다.",
          background: null,
          problem: null,
          solution: null,
          technicalChallenge: "분석 흐름",
          whyItMatters: "회고에 활용",
          confidence: "medium",
          requiresUserConfirmation: true,
          evidence: [],
        },
      ]),
    ).resolves.toMatchObject({
      alignment: "no_evidence",
      portfolioDraft: null,
      requiresUserConfirmation: true,
    });
  });
});
