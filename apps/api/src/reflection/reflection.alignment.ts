import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  ReflectionAlignment,
  ReflectionAnalysis,
  ReflectionDraft,
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
    const problem = draft.memorableProblem.trim();
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
          "당신은 Repository 근거와 사용자의 짧은 회고를 비교하는 검증 보조자입니다.",
          "사용자의 회고를 후보에 억지로 맞추지 마세요.",
          "회고가 후보와 의미상 일치하면 matched, 일부만 연결되면 partial, 후보와 다르면 mismatched를 사용하세요.",
          "Repository 근거가 없거나 회고가 비어 있으면 no_evidence를 사용하세요.",
          "matchedChallengeTitle은 제공된 후보 title 중 하나 또는 null만 사용하세요.",
          "포트폴리오 요약은 회고와 근거가 연결될 때만 작성하고, 불일치나 근거 부족이면 null을 사용하세요.",
          "응답은 설명 없이 아래 JSON 구조만 반환하세요.",
          '{"alignment":"matched|partial|mismatched|no_evidence","matchedChallengeTitle":"string|null","message":"string","portfolioSummary":"string|null","requiresUserConfirmation":true}',
        ].join("\n"),
        userPrompt: JSON.stringify(
          {
            task: "사용자 회고와 기술적 도전 후보의 연결 가능성을 판정하세요.",
            reflection: {
              memorableProblem: draft.memorableProblem,
              attempts: draft.attempts,
              improvement: draft.improvement,
              customChallengeTitle: draft.customChallengeTitle,
              customChallengeNote: draft.customChallengeNote,
              challengeAnswers: draft.challengeAnswers,
            },
            candidates,
          },
          null,
          2,
        ),
        temperature: 0,
      });
      const parsed = parseReflectionAlignmentResponse(rawResponse);
      if (
        (parsed.alignment === "mismatched" || parsed.alignment === "no_evidence") &&
        parsed.matchedChallengeTitle
      ) {
        return createNoEvidenceResult(
          "회고와 후보가 일치하지 않아 Repository 근거를 연결하지 않았습니다. 사용자 확인이 필요합니다.",
        );
      }
      const matchedCandidate = parsed.matchedChallengeTitle
        ? candidates.find((candidate) => candidate.title === parsed.matchedChallengeTitle)
        : undefined;

      if (parsed.matchedChallengeTitle && !matchedCandidate) {
        return createNoEvidenceResult(
          "AI가 연결한 후보를 Repository 분석 결과에서 찾지 못했습니다. 사용자 확인이 필요합니다.",
        );
      }

      return {
        ...parsed,
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
    typeof parsed.requiresUserConfirmation !== "boolean"
  ) {
    throw new ReflectionAlignmentValidationError();
  }

  return {
    alignment: parsed.alignment,
    matchedChallengeTitle: parsed.matchedChallengeTitle,
    message: parsed.message,
    portfolioSummary: parsed.portfolioSummary,
    requiresUserConfirmation: parsed.requiresUserConfirmation,
  };
}

function createNoEvidenceResult(message: string): ReflectionAnalysis {
  return {
    alignment: "no_evidence",
    matchedChallengeTitle: null,
    matchedChallengeEvidence: [],
    message,
    portfolioSummary: null,
    requiresUserConfirmation: true,
  };
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
