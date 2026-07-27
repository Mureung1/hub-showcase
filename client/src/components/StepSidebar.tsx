import type { Step } from "../lib/api";
import StepRow from "./StepRow";

interface Props {
  steps: Step[];
  selectedStepId: number | null;
  onSelectStep: (id: number) => void;
  repoFullName: string | null;
  branch: string | null;
}

export default function StepSidebar({ steps, selectedStepId, onSelectStep, repoFullName, branch }: Props) {
  return (
    <div className="sidebar">
      <div className="sidebar-head">
        <label className="label-mono" style={{ margin: 0 }}>
          REPOSITORY
        </label>
        <div className="repo">🐙 {repoFullName ?? "연결된 저장소 없음"}</div>
        {branch && <div className="label-mono" style={{ margin: "2px 0 0" }}>branch: {branch}</div>}
      </div>
      <div className="steps">
        {steps.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            isSelected={step.id === selectedStepId}
            onSelect={onSelectStep}
          />
        ))}
      </div>
    </div>
  );
}
