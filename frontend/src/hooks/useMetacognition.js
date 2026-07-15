// 메타인지 보정 루프(예측 → 회상 → 대조) 상태·저장을 한 곳에 모은다.
// ProjectIntro의 렌더 결합을 줄이기 위해 로직만 훅으로 분리한다(과분리 금지 원칙: 화면은 아직 쪼개지 않음).
import { useState } from "react";
import { ALGORITHM_VERSION } from "../lib/recommendations";
import { loadCalibration, saveCalibration } from "../lib/storage";

// 실천 카드가 목표로 하는 "핵심 3개".
export const RECALL_TARGET = 3;

export function useMetacognition(resultId) {
  const [recallPhase, setRecallPhase] = useState("predict"); // predict → recall → done
  const [recallPredicted, setRecallPredicted] = useState(null);
  const [recallActual, setRecallActual] = useState(null);
  const [calibrationCount, setCalibrationCount] = useState(() => loadCalibration().length);

  function resetRecall() {
    setRecallPhase("predict");
    setRecallPredicted(null);
    setRecallActual(null);
  }

  function saveCalibrationRecord() {
    if (recallPredicted === null || recallActual === null) {
      return;
    }
    const next = saveCalibration({
      algorithmVersion: ALGORITHM_VERSION,
      resultId,
      target: RECALL_TARGET,
      predicted: recallPredicted,
      actual: recallActual,
      calibrationError: Math.abs(recallPredicted - recallActual),
    });
    setCalibrationCount(next.length);
    setRecallPhase("done");
  }

  return {
    recallPhase,
    setRecallPhase,
    recallPredicted,
    setRecallPredicted,
    recallActual,
    setRecallActual,
    calibrationCount,
    setCalibrationCount,
    resetRecall,
    saveCalibrationRecord,
  };
}
