import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  ReflectionAlignment,
  ReflectionAnalysis,
  ReflectionDraft,
  PortfolioDraft,
  PortfolioImplementationStep,
  TechnicalChallengeCandidate,
} from "@ptop/contracts";
import {
  TECHNICAL_CHALLENGE_AI_CLIENT,
  TechnicalChallengeAiResponseError,
  TechnicalChallengeAiUnavailableError,
  type TechnicalChallengeAiClient,
} from "../repository-analysis/infrastructure/ai/technical-challenge.client";

export class ReflectionAlignmentValidationError extends Error {
  constructor(message = "회고 정합성 응답을 검증할 수 없습니다.") {
    super(message);
    this.name = "ReflectionAlignmentValidationError";
  }
}

@Injectable()
export class ReflectionAlignmentAnalyzer {
  constructor(
    @Inject(TECHNICAL_CHALLENGE_AI_CLIENT)
    private readonly aiClient: TechnicalChallengeAiClient,
    private readonly configService: ConfigService,
  ) {}

  async analyze(
    draft: ReflectionDraft,
    candidates: TechnicalChallengeCandidate[],
  ): Promise<ReflectionAnalysis> {
    const initialReflection = draft.memorableProblem.trim();
    const postAnalysisReflection = draft.postAnalysisReflection.trim();
    const problem = initialReflection || postAnalysisReflection;
    if (!problem || candidates.length === 0) {
      return createNoEvidenceResult(
        candidates.length === 0
          ? "Repository 근거와 연결할 기술적 도전 후보를 찾지 못했습니다."
          : "작성한 회고 내용이 없어 기술적 도전과 비교하지 못했습니다.",
      );
    }

    const model = this.configService.get<string>("AI_MODEL")?.trim();
    const apiKey = this.configService.get<string>("AI_API_KEY")?.trim();
    if (!model || !apiKey) {
      return createNoEvidenceResult(
        "AI 분석 설정이 없어 회고와 기술적 도전의 정합성을 확인하지 못했습니다. 사용자 확인이 필요합니다.",
      );
    }

    try {
      const rawResponse = await this.aiClient.generate({
        model,
        systemPrompt: [
          "당신은 Repository 근거와 사용자의 짧은 회고를 바탕으로 포트폴리오 초안을 만드는 검증 보조자입니다.",
          "분석 중 회고는 사용자가 처음 정의한 문제이므로 기술적 도전 후보를 재정렬하는 가장 중요한 신호로 사용하세요.",
          "분석 후 회고가 있으면 초기 회고를 대체하지 말고 보완 정보로 함께 비교하세요.",
          "사용자의 회고를 후보에 억지로 맞추지 마세요.",
          "회고가 후보와 의미상 일치하면 matched, 일부만 연결되면 partial, 후보와 다르면 mismatched를 사용하세요.",
          "Repository 근거가 없거나 회고가 비어 있으면 no_evidence를 사용하세요.",
          "matchedChallengeTitle은 제공된 후보 title 중 하나 또는 null만 사용하세요.",
          "포트폴리오 초안은 사용자의 문장을 그대로 복사하지 말고, 사실을 추가하지 않는 범위에서 Background-Problem-Solution-Contribution-Result 구조로 재구성하세요.",
          "portfolioDraft에는 기술적 도전의 핵심을 technicalChallenge에 쓰고, 실제로 확인되는 판단을 keyDecisions에 1~3개, 결과를 result에, 배운 점을 learnings에 1~3개 작성하세요.",
          "Solution은 한두 문장으로 끝내지 말고 implementationSteps에 실제 구현 단위를 1~5개 작성하세요.",
          "각 implementationStep에는 구현 내용 summary, 확인 가능한 filePath 또는 null, 왜 그렇게 구현했는지 rationale, 실제 근거의 referenceId·URL·filePath 중 확인 가능한 값만 evidenceRefs에 작성하세요.",
          "decisionRationale에는 기술적 판단과 선택 이유를 1~3개, tradeoffs에는 확인된 트레이드오프를 최대 3개, validation에는 테스트·검증·결과 확인 방법을 최대 3개 작성하세요.",
          "코드 변경 내용이나 파일 경로가 제공된 근거에 없으면 추측하지 말고 filePath를 null로 두며 사용자 확인이 필요하다고 표시하세요.",
          "기술명, 성능 수치, 담당 범위, 해결 결과를 입력 근거 없이 만들지 마세요.",
          "근거가 부족하거나 개인 기여가 확인되지 않으면 portfolioDraft를 null로 만들고 requiresUserConfirmation을 true로 설정하세요.",
          "portfolioDraft.evidenceSummary에는 실제 제공된 PR, Issue, Discussion, Project, Commit 근거만 요약하세요.",
          "PR 근거에 imageUrls가 있을 때만 그 이미지를 포트폴리오 시각 자료로 사용할 수 있습니다. 이미지가 없으면 이미지를 만들지 말고 UI가 안내 문구를 표시하게 하세요.",
          "evidenceSummary는 근거마다 줄바꿈으로 구분한 짧은 개조식 목록으로 작성하세요.",
          "기존 후보와 회고가 연결되지 않거나 사용자가 말한 도전이 후보에 없으면 suggestedChallenges에 최대 2개의 보완 후보를 만드세요.",
          "보완 후보는 제공된 candidates의 Repository 근거만 재사용해야 하며, 새 URL·파일·수치·기술을 만들지 마세요.",
          "제공된 근거로도 보완 후보를 뒷받침할 수 없으면 suggestedChallenges를 빈 배열로 반환하세요.",
          "응답은 설명 없이 아래 JSON 구조만 반환하세요.",
          '{"alignment":"matched|partial|mismatched|no_evidence","matchedChallengeTitle":"string|null","message":"string","portfolioSummary":"string|null","portfolioDraft":{"title":"string","technicalChallenge":"string","background":"string","problem":"string","solution":"string","implementationSteps":[{"summary":"string","filePath":"string|null","rationale":"string","evidenceRefs":["string"]}],"decisionRationale":["string"],"tradeoffs":["string"],"validation":["string"],"contribution":"string","keyDecisions":["string"],"result":"string","learnings":["string"],"evidenceSummary":"string","requiresUserReview":true},"requiresUserConfirmation":true,"suggestedChallenges":[{"title":"string","summary":"string","background":"string|null","problem":"string|null","solution":"string|null","technicalChallenge":"string","whyItMatters":"string","confidence":"high|medium|low","requiresUserConfirmation":true,"evidence":[{"evidenceType":"commit|pull_request|issue|discussion|project|file|config|release","referenceId":"string|null","title":"string","url":"string|null","filePath":"string|null","imageUrls":["string"]}]}]}',
        ].join("\n"),
        userPrompt: JSON.stringify(
          {
            task: "사용자 회고와 기술적 도전 후보의 연결 가능성을 판정하세요.",
            reflection: {
              initialReflection,
              postAnalysisReflection,
              memorableProblem: draft.memorableProblem,
              attempts: draft.attempts,
              improvement: draft.improvement,
              customChallengeTitle: draft.customChallengeTitle,
              customChallengeNote: draft.customChallengeNote,
              challengeAnswers: draft.challengeAnswers,
            },
            candidates: candidates.filter((candidate) =>
              draft.selectedChallengeTitles.length === 0 ||
              draft.selectedChallengeTitles.includes(candidate.title),
            ),
          },
          null,
          2,
        ),
        temperature: 0,
      });
      const parsed = parseReflectionAlignmentResponse(rawResponse);
      const sanitizedSuggestions = restrictSuggestedChallengeImages(
        parsed.suggestedChallenges ?? [],
        candidates,
      );
      if (parsed.alignment === "mismatched" || parsed.alignment === "no_evidence") {
        return createNoEvidenceResult(
          "회고와 후보가 일치하지 않아 Repository 근거를 연결하지 않았습니다. 사용자 확인이 필요합니다.",
          sanitizedSuggestions,
        );
      }
      const matchedCandidate = parsed.matchedChallengeTitle
        ? candidates.find((candidate) => candidate.title === parsed.matchedChallengeTitle)
        : undefined;

      if (parsed.matchedChallengeTitle && !matchedCandidate) {
        return createNoEvidenceResult(
          "AI가 연결한 후보를 Repository 분석 결과에서 찾지 못했습니다. 사용자 확인이 필요합니다.",
          sanitizedSuggestions,
        );
      }

      return {
        ...parsed,
        suggestedChallenges: sanitizedSuggestions,
        matchedChallengeEvidence: matchedCandidate?.evidence ?? [],
      };
    } catch (error) {
      if (
        error instanceof TechnicalChallengeAiUnavailableError ||
        error instanceof TechnicalChallengeAiResponseError
      ) {
        return createNoEvidenceResult(
          "회고 정합성 분석을 완료하지 못했습니다. Repository 근거와 사용자 경험을 직접 확인해 주세요.",
        );
      }
      if (error instanceof ReflectionAlignmentValidationError) {
        return createNoEvidenceResult(
          "회고 정합성 응답을 검증하지 못했습니다. 사용자 확인이 필요합니다.",
        );
      }
      return createNoEvidenceResult(
        "회고와 Repository 근거를 연결하는 중 오류가 발생했습니다. 사용자 확인이 필요합니다.",
      );
    }
  }
}

export function parseReflectionAlignmentResponse(rawResponse: string): Omit<ReflectionAnalysis, "matchedChallengeEvidence"> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(removeJsonFence(rawResponse));
  } catch {
    throw new ReflectionAlignmentValidationError("회고 정합성 응답이 올바른 JSON이 아닙니다.");
  }

  if (
    !isRecord(parsed) ||
    !isAlignment(parsed.alignment) ||
    !(parsed.matchedChallengeTitle === null || typeof parsed.matchedChallengeTitle === "string") ||
    typeof parsed.message !== "string" ||
    !(parsed.portfolioSummary === null || typeof parsed.portfolioSummary === "string") ||
    !(parsed.portfolioDraft === null || isPortfolioDraft(parsed.portfolioDraft)) ||
    typeof parsed.requiresUserConfirmation !== "boolean" ||
    (parsed.suggestedChallenges !== undefined &&
      (!Array.isArray(parsed.suggestedChallenges) ||
        parsed.suggestedChallenges.length > 2 ||
        parsed.suggestedChallenges.some((candidate) => !isTechnicalChallengeCandidate(candidate))))
  ) {
    throw new ReflectionAlignmentValidationError();
  }

  return {
    alignment: parsed.alignment,
    matchedChallengeTitle: parsed.matchedChallengeTitle,
    message: parsed.message,
    portfolioSummary: parsed.portfolioSummary,
    portfolioDraft: parsed.portfolioDraft,
    requiresUserConfirmation: parsed.requiresUserConfirmation,
    suggestedChallenges: parsed.suggestedChallenges ?? [],
  };
}

function createNoEvidenceResult(
  message: string,
  suggestedChallenges: TechnicalChallengeCandidate[] = [],
): ReflectionAnalysis {
  return {
    alignment: "no_evidence",
    matchedChallengeTitle: null,
    matchedChallengeEvidence: [],
    message,
    portfolioSummary: null,
    portfolioDraft: null,
    requiresUserConfirmation: true,
    suggestedChallenges,
  };
}

function isTechnicalChallengeCandidate(value: unknown): value is TechnicalChallengeCandidate {
  if (!isRecord(value) || !Array.isArray(value.evidence)) return false;

  return (
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    (value.background === null || typeof value.background === "string") &&
    (value.problem === null || typeof value.problem === "string") &&
    (value.solution === null || typeof value.solution === "string") &&
    typeof value.technicalChallenge === "string" &&
    typeof value.whyItMatters === "string" &&
    (value.confidence === "high" || value.confidence === "medium" || value.confidence === "low") &&
    typeof value.requiresUserConfirmation === "boolean" &&
    value.evidence.length > 0 &&
    value.evidence.every(isTechnicalChallengeEvidenceReference)
  );
}

function isTechnicalChallengeEvidenceReference(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    typeof value.evidenceType === "string" &&
    (value.referenceId === null || typeof value.referenceId === "string") &&
    typeof value.title === "string" &&
    (value.url === null || typeof value.url === "string") &&
    (value.filePath === null || typeof value.filePath === "string") &&
    (value.imageUrls === undefined ||
      (Array.isArray(value.imageUrls) && value.imageUrls.every((item) => typeof item === "string")))
  );
}

function restrictSuggestedChallengeImages(
  suggestions: TechnicalChallengeCandidate[],
  candidates: TechnicalChallengeCandidate[],
): TechnicalChallengeCandidate[] {
  const allowed = new Set(
    candidates.flatMap((candidate) => candidate.evidence.flatMap((evidence) => evidence.imageUrls ?? [])),
  );

  return suggestions.map((candidate) => ({
    ...candidate,
    evidence: candidate.evidence.map((evidence) => ({
      ...evidence,
      ...(evidence.imageUrls
        ? { imageUrls: evidence.imageUrls.filter((url) => allowed.has(url)) }
        : {}),
    })),
  }));
}

function isPortfolioDraft(value: unknown): value is PortfolioDraft {
  if (!isRecord(value)) return false;

  return (
    typeof value.title === "string" &&
    (value.technicalChallenge === undefined || typeof value.technicalChallenge === "string") &&
    typeof value.background === "string" &&
    typeof value.problem === "string" &&
    typeof value.solution === "string" &&
    (value.implementationSteps === undefined ||
      (Array.isArray(value.implementationSteps) &&
        value.implementationSteps.length <= 5 &&
        value.implementationSteps.every(isPortfolioImplementationStep))) &&
    (value.decisionRationale === undefined || isStringArray(value.decisionRationale, 3)) &&
    (value.tradeoffs === undefined || isStringArray(value.tradeoffs, 3)) &&
    (value.validation === undefined || isStringArray(value.validation, 3)) &&
    typeof value.contribution === "string" &&
    (value.keyDecisions === undefined ||
      (Array.isArray(value.keyDecisions) && value.keyDecisions.every((item) => typeof item === "string"))) &&
    (value.result === undefined || typeof value.result === "string") &&
    (value.learnings === undefined ||
      (Array.isArray(value.learnings) && value.learnings.every((item) => typeof item === "string"))) &&
    typeof value.evidenceSummary === "string" &&
    typeof value.requiresUserReview === "boolean"
  );
}

function isPortfolioImplementationStep(value: unknown): value is PortfolioImplementationStep {
  if (!isRecord(value)) return false;

  return (
    typeof value.summary === "string" &&
    (value.filePath === null || typeof value.filePath === "string") &&
    typeof value.rationale === "string" &&
    isStringArray(value.evidenceRefs)
  );
}

function isStringArray(value: unknown, maxLength = 5): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxLength &&
    value.every((item) => typeof item === "string")
  );
}

function isAlignment(value: unknown): value is ReflectionAlignment {
  return value === "matched" || value === "partial" || value === "mismatched" || value === "no_evidence";
}

function removeJsonFence(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:```|~~~)(?:json)?\s*([\s\S]*?)\s*(?:```|~~~)$/i);
  return match?.[1]?.trim() ?? trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
