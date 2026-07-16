import { LocateFixed } from "lucide-react";

import type { AnalysisMoveMode } from "./types";

type AnalysisLocationControlsProps = {
  mode: AnalysisMoveMode;
  canConfirm: boolean;
  onStart: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AnalysisLocationControls({
  mode,
  canConfirm,
  onStart,
  onConfirm,
  onCancel,
}: AnalysisLocationControlsProps) {
  if (mode === "idle") {
    return (
      <button className="analysis-move-start" type="button" onClick={onStart}>
        <LocateFixed size={15} /> 분석 위치 이동
      </button>
    );
  }

  return (
    <div className="analysis-move-controls" role="group" aria-label="분석 위치 이동">
      <span>
        {canConfirm
          ? "지도의 중심을 분석 위치로 사용합니다."
          : "지원 지역 안으로 지도를 이동해 주세요."}
      </span>
      <button type="button" onClick={onCancel}>
        취소
      </button>
      <button type="button" className="is-primary" disabled={!canConfirm} onClick={onConfirm}>
        이 위치에서 검색
      </button>
    </div>
  );
}
