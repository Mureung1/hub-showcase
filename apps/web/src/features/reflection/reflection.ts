export type ReflectionChallengeAnswers = {
  context: string;
  decision: string;
  contribution: string;
};

export type ReflectionDraft = {
  motivation: string;
  role: string;
  memorableProblem: string;
  attempts: string;
  improvement: string;
  selectedChallengeTitles: string[];
  challengeAnswers: Record<string, ReflectionChallengeAnswers>;
};

export type ReflectionStorage = Pick<Storage, "getItem" | "setItem">;

const REFLECTION_STORAGE_PREFIX = "ptop:reflection-draft:";

export const REFLECTION_PROMPTS = [
  { key: "motivation", label: "프로젝트를 시작한 이유는 무엇인가요?" },
  { key: "role", label: "본인이 맡은 역할은 무엇인가요?" },
  { key: "memorableProblem", label: "가장 기억에 남는 문제는 무엇인가요?" },
  { key: "attempts", label: "문제를 해결하기 위해 어떤 시도를 했나요?" },
  { key: "improvement", label: "프로젝트를 다시 한다면 무엇을 개선하고 싶나요?" },
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
