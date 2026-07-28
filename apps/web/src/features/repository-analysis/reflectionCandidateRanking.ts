import type { TechnicalChallengeCandidate } from "@ptop/contracts";

const STOP_WORDS = new Set([
  "그리고", "그러나", "있는", "있던", "문제", "무엇", "가장", "위해", "에서",
  "으로", "하는", "했던", "제가", "내가", "정말", "대한", "통해", "때문",
]);

/** Preserve AI order as a fallback while prioritizing candidates matching the first reflection. */
export function rankCandidatesByReflection(
  candidates: TechnicalChallengeCandidate[],
  reflection: string,
): TechnicalChallengeCandidate[] {
  const tokens = tokenize(reflection);
  if (tokens.length === 0) return candidates;

  return candidates
    .map((candidate, index) => ({ candidate, index, score: scoreCandidate(candidate, tokens) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ candidate }) => candidate);
}

function scoreCandidate(candidate: TechnicalChallengeCandidate, tokens: string[]): number {
  const searchable = tokenize([
    candidate.title,
    candidate.summary,
    candidate.problem,
    candidate.solution,
    candidate.technicalChallenge,
    ...candidate.evidence.map((item) => item.title),
  ].filter(Boolean).join(" "));

  return tokens.reduce((score, token) => score + (searchable.includes(token) ? token.length : 0), 0);
}

function tokenize(value: string): string[] {
  return [...new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 2 && !STOP_WORDS.has(token)),
  )];
}
