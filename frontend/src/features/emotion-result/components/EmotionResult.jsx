import React from "react";
import ProgressBar from "../../../shared/components/ProgressBar";
import { emotionDefinitions } from "../../../shared/constants/emotionDefinitions";
import EmotionSignalOrb from "./EmotionSignalOrb";

export default function EmotionResult({ result, onAnalyzeAgain, disabled = false }) {
  if (!result) return null;

  return (
    <section className="emotion-analysis" aria-labelledby="emotion-result-title">
      <div className="emotion-analysis__heading">
        <span>REFERENCE SIGNAL</span>
        <h2 id="emotion-result-title">감정 신호 참고값</h2>
        <p>확정된 감정이나 진단이 아니에요</p>
      </div>

      <EmotionSignalOrb result={result} loading={result.isLivePreview} />

      {result.isLivePreview ? (
        <div className="live-emotion-status" role="status" aria-live="polite">
          <span aria-hidden="true" />
          카메라 얼굴 움직임을 실시간 반영 중
        </div>
      ) : (
        <div className="possible-states" aria-label="기존 상태 가능성">
          {(result.possibleStates || []).map((state) => (
            <div key={state.label} className="state-item">
              <span className="label">{state.label}</span>
              <span className="confidence">{Math.round(state.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      <div className="emotion-scores" aria-label="정규화된 감정 점수">
        {(result.scores || []).map((emotion) => {
          const displayLabel =
            emotion.label || emotionDefinitions[emotion.key]?.label || emotion.key;

          return (
            <ProgressBar
              key={emotion.key}
              label={displayLabel}
              ariaLabel={`${displayLabel} 가능성`}
              value={emotion.score}
              tone={emotion.key}
            />
          );
        })}
      </div>

      <details>
        <summary>판단 근거 및 자세히 보기</summary>
        {Array.isArray(result.evidence) && result.evidence.length > 0 ? (
          <ul>
            {result.evidence.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="empty-evidence">표시할 판단 근거가 없습니다.</p>
        )}
        <div>대응 방식: {result.responseApproach}</div>
        <div>확인 필요: {result.needsConfirmation ? "예" : "아니오"}</div>
      </details>

      <p className="analysis-disclaimer">
        이 결과는 입력한 신호를 바탕으로 한 가능성 추정이며 감정을 확정하지 않습니다. 의료적 진단이나
        전문 상담을 대신하지 않습니다.
      </p>
      {!result.isLivePreview && (
        <button type="button" className="analyze-again" onClick={onAnalyzeAgain} disabled={disabled}>
          다시 분석하기
        </button>
      )}
    </section>
  );
}
