import React from "react";
import { emotionDefinitions } from "../../../shared/constants/emotionDefinitions";

export default function EmotionResult({ result, onAnalyzeAgain, disabled = false }) {
  if (!result) return null;

  return (
    <section className="emotion-analysis" aria-labelledby="emotion-result-title">
      <h4 id="emotion-result-title">AI의 상태 추정</h4>

      <div className="possible-states" aria-label="기존 상태 가능성">
        {(result.possibleStates || []).map((state) => (
          <div key={state.label} className="state-item">
            <span className="label">{state.label}</span>
            <span className="confidence">{Math.round(state.confidence * 100)}%</span>
          </div>
        ))}
      </div>

      <div className="emotion-scores" aria-label="정규화된 감정 점수">
        {(result.scores || []).map((emotion) => {
          const displayLabel =
            emotion.label || emotionDefinitions[emotion.key]?.label || emotion.key;

          return (
            <div key={emotion.key}>
              <div className="emotion-score-heading">
                <span>{displayLabel}</span>
                <strong>{emotion.score}%</strong>
              </div>
              <div
                className="emotion-score-track"
                role="progressbar"
                aria-label={`${displayLabel} 가능성`}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={emotion.score}
              >
                <span
                  className={`emotion-score-fill emotion-score-${emotion.key}`}
                  style={{ width: `${emotion.score}%` }}
                />
              </div>
            </div>
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
      <button type="button" className="analyze-again" onClick={onAnalyzeAgain} disabled={disabled}>
        다시 분석하기
      </button>
    </section>
  );
}
