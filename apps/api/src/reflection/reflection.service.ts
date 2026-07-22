import { Injectable } from "@nestjs/common";
import type {
  ReflectionDraft,
  ReflectionDraftSaveResponse,
} from "@ptop/contracts";
import { ReflectionDraftPersistence } from "./reflection.persistence";

export class InvalidReflectionDraftError extends Error {
  constructor() {
    super("회고 초안 형식이 올바르지 않습니다.");
    this.name = "InvalidReflectionDraftError";
  }
}

@Injectable()
export class ReflectionService {
  constructor(private readonly persistence: ReflectionDraftPersistence) {}

  async save(
    analysisResultId: string,
    draft: unknown,
  ): Promise<ReflectionDraftSaveResponse> {
    if (!analysisResultId.trim() || !isReflectionDraft(draft)) {
      throw new InvalidReflectionDraftError();
    }

    return this.persistence.save(analysisResultId, draft);
  }

  async find(analysisResultId: string): Promise<ReflectionDraftSaveResponse | null> {
    if (!analysisResultId.trim()) {
      throw new InvalidReflectionDraftError();
    }

    return this.persistence.find(analysisResultId);
  }
}

function isReflectionDraft(value: unknown): value is ReflectionDraft {
  if (!isRecord(value)) {
    return false;
  }

  const requiredStrings = [
    "motivation",
    "role",
    "memorableProblem",
    "attempts",
    "improvement",
    "customChallengeTitle",
    "customChallengeNote",
  ];

  if (requiredStrings.some((key) => typeof value[key] !== "string")) {
    return false;
  }

  if (
    !Array.isArray(value.selectedChallengeTitles) ||
    value.selectedChallengeTitles.length > 2 ||
    value.selectedChallengeTitles.some((title) => typeof title !== "string")
  ) {
    return false;
  }

  if (!isRecord(value.challengeAnswers)) {
    return false;
  }

  return Object.values(value.challengeAnswers).every((answers) => {
    if (!isRecord(answers)) {
      return false;
    }

    return ["context", "decision", "contribution"].every(
      (key) => typeof answers[key] === "string",
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
