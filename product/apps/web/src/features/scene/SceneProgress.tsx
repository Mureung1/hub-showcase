import { CheckCircle2 } from "lucide-react";

import type { SceneJob } from "./sceneApi";

const stageLabels: Record<string, string> = {
  validate: "입력 검증",
  preprocess: "카메라 복원",
  anonymize: "사람 영역 익명화",
  train: "Splatfacto 학습",
  export: "PLY 내보내기",
};

const defaultStages = [
  { name: "validate", status: "pending", message: null },
  { name: "preprocess", status: "pending", message: null },
  { name: "anonymize", status: "pending", message: null },
  { name: "train", status: "pending", message: null },
  { name: "export", status: "pending", message: null },
];

export function SceneProgress({ job }: { job: SceneJob | null }) {
  return (
    <div className="scene-progress scene-job-progress" aria-label="3D 장면 처리 단계">
      {(job?.stages ?? defaultStages).map((stage, index) => (
        <div key={stage.name} className={`stage-${stage.status}`}>
          <i>{stage.status === "passed" ? <CheckCircle2 size={13} /> : index + 1}</i>
          <b>{stageLabels[stage.name]}</b>
          <span>{stage.message ?? stage.status}</span>
        </div>
      ))}
    </div>
  );
}
