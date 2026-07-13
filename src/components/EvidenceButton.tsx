import { QuotesIcon } from "@phosphor-icons/react";
import type { EvidenceRef } from "../types/context";
import EvidenceCoverageBadge from "./EvidenceCoverageBadge";

type EvidenceButtonProps = {
  evidence?: EvidenceRef[];
  onOpen?: (evidence: EvidenceRef[]) => void;
  appearance?: "badge" | "primary";
};

function EvidenceButton({ evidence = [], onOpen, appearance = "badge" }: EvidenceButtonProps) {
  if (evidence.length === 0 || !onOpen) return null;

  return (
    <button
      className={`evidence-button${appearance === "primary" ? " evidence-button-primary" : ""}`}
      type="button"
      aria-label={`근거 ${evidence.length}개`}
      onClick={() => onOpen(evidence)}
    >
      {appearance === "primary" ? (
        <>
          <QuotesIcon aria-hidden="true" size={18} weight="regular" />
          <span>원문 근거 열기</span>
          <small>{evidence.length}</small>
        </>
      ) : (
        <EvidenceCoverageBadge
          evidenceCount={evidence.length}
          label="근거"
          compact
        />
      )}
    </button>
  );
}

export default EvidenceButton;
