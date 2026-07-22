export type { ReflectionChallengeAnswers, ReflectionDraft } from "@ptop/contracts";
import type { ReflectionChallengeAnswers, ReflectionDraft } from "@ptop/contracts";

export type ReflectionStorage = Pick<Storage, "getItem" | "setItem">;

const REFLECTION_STORAGE_PREFIX = "ptop:reflection-draft:";

export const REFLECTION_PROMPTS = [
  { key: "motivation", label: "이 프로젝트를 시작한 이유를 한 줄로 적어볼까요?" },
  { key: "role", label: "내가 맡았던 일을 한 줄로 적어볼까요?" },
  { key: "memorableProblem", label: "가장 기억에 남는 문제를 한 줄로 적어볼까요?" },
] as const;

export const CHALLENGE_FOLLOW_UP_PROMPTS = [
  { key: "context", label: "이 문제를 해결해야 했던 배경은 무엇인가요?" },
  { key: "decision", label: "여러 방법 중 현재 해결 방법을 선택한 이유는 무엇인가요?" },
  { key: "contribution", label: "본인이 직접 판단하고 기여한 부분은 무엇인가요?" },
] as const;

export function createEmptyReflectionDraft(): ReflectionDraft {
  return {
    motivation: "",
    role: "",
    memorableProblem: "",
    attempts: "",
    improvement: "",
    customChallengeTitle: "",
    customChallengeNote: "",
    selectedChallengeTitles: [],
    challengeAnswers: {},
  };
}

export function loadReflectionDraft(
  repositoryUrl: string,
  storage: ReflectionStorage = window.localStorage,
): ReflectionDraft {
  const rawValue = storage.getItem(getReflectionStorageKey(repositoryUrl));

  if (!rawValue) {
    return createEmptyReflectionDraft();
  }

  try {
    return normalizeReflectionDraft(JSON.parse(rawValue));
  } catch {
    return createEmptyReflectionDraft();
  }
}

export function saveReflectionDraft(
  repositoryUrl: string,
  draft: ReflectionDraft,
  storage: ReflectionStorage = window.localStorage,
): void {
  storage.setItem(getReflectionStorageKey(repositoryUrl), JSON.stringify(draft));
}

export function addSelectedChallenge(
  draft: ReflectionDraft,
  title: string,
): string[] {
  const selected = draft.selectedChallengeTitles;

  if (selected.includes(title)) {
    return selected.filter((candidate) => candidate !== title);
  }

  if (selected.length >= 2) {
    return selected;
  }

  return [...selected, title];
}

export function getReflectionStorageKey(repositoryUrl: string): string {
  return `${REFLECTION_STORAGE_PREFIX}${encodeURIComponent(repositoryUrl.trim().toLowerCase())}`;
}

function normalizeReflectionDraft(value: unknown): ReflectionDraft {
  if (!isRecord(value)) {
    return createEmptyReflectionDraft();
  }

  const selectedChallengeTitles = Array.isArray(value.selectedChallengeTitles)
    ? value.selectedChallengeTitles.filter(isNonEmptyString).slice(0, 2)
    : [];

  return {
    motivation: getString(value.motivation),
    role: getString(value.role),
    memorableProblem: getString(value.memorableProblem),
    attempts: getString(value.attempts),
    improvement: getString(value.improvement),
    customChallengeTitle: getString(value.customChallengeTitle),
    customChallengeNote: getString(value.customChallengeNote),
    selectedChallengeTitles,
    challengeAnswers: normalizeChallengeAnswers(value.challengeAnswers),
  };
}

function normalizeChallengeAnswers(value: unknown): Record<string, ReflectionChallengeAnswers> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .flatMap(([title, answers]) => {
        if (!isRecord(answers)) {
          return [];
        }

        return [[
          title,
          {
            context: getString(answers.context),
            decision: getString(answers.decision),
            contribution: getString(answers.contribution),
          },
        ]];
      }),
  );
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
