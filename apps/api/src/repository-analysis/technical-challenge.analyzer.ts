import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  RepositoryAnalysisEvidenceType,
  TechnicalChallengeCandidate,
  TechnicalChallengeConfidence,
} from "@ptop/contracts";
import { createTechnicalChallengePrompt } from "./technical-challenge.prompt";
import {
  TECHNICAL_CHALLENGE_AI_CLIENT,
  TechnicalChallengeAiResponseError,
  TechnicalChallengeAiUnavailableError,
  type TechnicalChallengeAiClient,
} from "./technical-challenge.client";
import type {
  TechnicalChallengeAnalysisResult,
  TechnicalChallengeContext,
} from "./technical-challenge.models";

export class TechnicalChallengeResponseValidationError extends Error {
  constructor(message = "AI 기술적 도전 후보 응답을 검증할 수 없습니다.") {
    super(message);
    this.name = "TechnicalChallengeResponseValidationError";
  }
}

@Injectable()
export class TechnicalChallengeAnalyzer {
  constructor(
    @Inject(TECHNICAL_CHALLENGE_AI_CLIENT)
    private readonly aiClient: TechnicalChallengeAiClient,
    private readonly configService: ConfigService,
  ) {}

  async analyze(context: TechnicalChallengeContext): Promise<TechnicalChallengeAnalysisResult> {
    const model = this.configService.get<string>("AI_MODEL")?.trim();
    const apiKey = this.configService.get<string>("AI_API_KEY")?.trim();

    if (!model || !apiKey) {
      return {
        candidates: [],
        warning: "AI 분석 provider 설정이 없어 기술적 도전 후보를 생성하지 못했습니다.",
      };
    }

    try {
      const prompt = createTechnicalChallengePrompt(context);
      const rawResponse = await this.aiClient.generate({ ...prompt, model });
      return { candidates: parseTechnicalChallengeResponse(rawResponse), warning: null };
    } catch (error) {
      if (error instanceof TechnicalChallengeResponseValidationError) {
        return { candidates: [], warning: "AI 분석 응답을 검증하지 못했습니다." };
      }
      if (error instanceof TechnicalChallengeAiUnavailableError) {
        return { candidates: [], warning: "AI 분석 provider를 사용할 수 없습니다." };
      }
      if (error instanceof TechnicalChallengeAiResponseError) {
        return { candidates: [], warning: "AI 분석 provider 응답을 받지 못했습니다." };
      }
      return { candidates: [], warning: "기술적 도전 후보 분석 중 오류가 발생했습니다." };
    }
  }
}

export function parseTechnicalChallengeResponse(
  rawResponse: string,
): TechnicalChallengeCandidate[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(removeJsonFence(rawResponse));
  } catch {
    throw new TechnicalChallengeResponseValidationError("AI 응답이 올바른 JSON이 아닙니다.");
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.candidates)) {
    throw new TechnicalChallengeResponseValidationError("AI 응답에 candidates 배열이 없습니다.");
  }

  const candidates = parsed.candidates
    .filter(isCandidate)
    .map((candidate) => ({
      ...candidate,
      requiresUserConfirmation:
        candidate.requiresUserConfirmation || candidate.confidence === "low",
    }));

  if (candidates.length !== parsed.candidates.length || candidates.length === 0) {
    throw new TechnicalChallengeResponseValidationError(
      "근거가 없거나 형식이 올바르지 않은 후보가 포함되어 있습니다.",
    );
  }

  return candidates;
}

function removeJsonFence(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:```|~~~)(?:json)?\s*([\s\S]*?)\s*(?:```|~~~)$/i);
  return match?.[1]?.trim() ?? trimmed;
}

function isCandidate(value: unknown): value is TechnicalChallengeCandidate {
  if (!isRecord(value)) {
    return false;
  }

  const evidence = value.evidence;
  return (
    isString(value.title) &&
    isString(value.summary) &&
    isNullableString(value.background) &&
    isNullableString(value.problem) &&
    isNullableString(value.solution) &&
    isString(value.technicalChallenge) &&
    isString(value.whyItMatters) &&
    isConfidence(value.confidence) &&
    typeof value.requiresUserConfirmation === "boolean" &&
    Array.isArray(evidence) &&
    evidence.length > 0 &&
    evidence.every(isEvidenceReference)
  );
}

function isEvidenceReference(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isEvidenceType(value.evidenceType) &&
    isNullableString(value.referenceId) &&
    isString(value.title) &&
    isNullableString(value.url) &&
    isNullableString(value.filePath)
  );
}

function isEvidenceType(value: unknown): value is RepositoryAnalysisEvidenceType {
  return (
    value === "commit" ||
    value === "pull_request" ||
    value === "issue" ||
    value === "file" ||
    value === "config" ||
    value === "release"
  );
}

function isConfidence(value: unknown): value is TechnicalChallengeConfidence {
  return value === "high" || value === "medium" || value === "low";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
