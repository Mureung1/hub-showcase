import type { EvidenceRef } from "../types/context";

type EvidenceButtonProps = {
  evidence?: EvidenceRef[];
  onOpen?: (evidence: EvidenceRef[]) => void;
};

function EvidenceButton({ evidence = [], onOpen }: EvidenceButtonProps) {
  if (evidence.length === 0 || !onOpen) return null;

  return (
    <button className="evidence-button" type="button" onClick={() => onOpen(evidence)}>
      근거 {evidence.length}개
    </button>
  );
}

export default EvidenceButton;
