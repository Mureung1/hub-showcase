import {
  CheckCircleIcon,
  LinkSimpleBreakIcon,
  LinkSimpleIcon,
} from "@phosphor-icons/react";

type EvidenceCoverageBadgeProps = {
  evidenceCount: number;
  validated?: number;
  eligible?: number;
  /** @deprecated Compatibility for one release. Use validated. */
  coveredItems?: number;
  /** @deprecated Compatibility for one release. Use eligible. */
  totalItems?: number;
  label?: string;
  compact?: boolean;
};

function EvidenceCoverageBadge({
  evidenceCount,
  validated,
  eligible,
  coveredItems,
  totalItems,
  label = "근거 연결",
  compact = false,
}: EvidenceCoverageBadgeProps) {
  const safeEvidenceCount = Math.max(0, evidenceCount);
  const hasCoverageRatio = typeof eligible === "number" || typeof totalItems === "number";
  const safeEligible = Math.max(0, eligible ?? totalItems ?? 0);
  const safeValidated = Math.min(safeEligible, Math.max(0, validated ?? coveredItems ?? 0));
  const state = !hasCoverageRatio || safeEligible === 0
    ? safeEvidenceCount > 0 ? "complete" : "empty"
    : safeValidated === safeEligible
      ? "complete"
      : safeValidated > 0
        ? "partial"
        : "empty";
  const text = hasCoverageRatio
    ? safeEligible === 0
      ? `${label} · 근거 미제공`
      : `${label} ${safeValidated}/${safeEligible} · 인용 ${safeEvidenceCount}개`
    : `${label} ${safeEvidenceCount}개`;
  const compactText = hasCoverageRatio
    ? safeEligible === 0 ? "근거 미제공" : `${label} ${safeValidated}/${safeEligible}`
    : `${label} ${safeEvidenceCount}개`;
  const StatusIcon = state === "complete"
    ? CheckCircleIcon
    : state === "partial"
      ? LinkSimpleIcon
      : LinkSimpleBreakIcon;

  return (
    <span
      className={`evidence-coverage-badge ${state}${compact ? " compact" : ""}`}
      aria-label={text}
      title={text}
    >
      <StatusIcon aria-hidden="true" size={16} weight="regular" />
      <span>{compact ? compactText : text}</span>
    </span>
  );
}

export default EvidenceCoverageBadge;
