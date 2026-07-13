import type { ContextAnalysisResult, EvidenceRef } from "../types/context";

type EvidenceBearingItem = {
  evidence?: EvidenceRef[];
};

export function summarizeEvidenceCoverage(items: EvidenceBearingItem[]) {
  return items.reduce(
    (summary, item) => {
      const count = item.evidence?.length ?? 0;
      return {
        evidenceCount: summary.evidenceCount + count,
        validated: summary.validated + (count > 0 ? 1 : 0),
        eligible: summary.eligible + 1,
      };
    },
    { evidenceCount: 0, validated: 0, eligible: 0 },
  );
}

export function summarizeResultEvidenceCoverage(
  result?: Pick<ContextAnalysisResult, "decisions" | "participants" | "questions" | "keyTerms">,
) {
  if (!result) return { evidenceCount: 0, validated: 0, eligible: 0 };
  return summarizeEvidenceCoverage([
    ...result.decisions,
    ...result.participants,
    ...result.questions,
    ...result.keyTerms,
  ]);
}
