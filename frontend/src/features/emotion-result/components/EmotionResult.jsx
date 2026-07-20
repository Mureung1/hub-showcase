import React from "react";
import AnalysisDisclaimer from "./AnalysisDisclaimer";
import EmotionScoreBar from "./EmotionScoreBar";
import EvidenceList from "./EvidenceList";

export default function EmotionResult({ result, onAnalyzeAgain, disabled = false }) {
  console.count("EmotionResult render");

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
        {(result.scores || []).map((emotion) => (
          <EmotionScoreBar
            key={emotion.key}
            emotionKey={emotion.key}
            label={emotion.label}
            score={emotion.score}
          />
        ))}
      </div>

      <details>
        <summary>판단 근거 및 자세히 보기</summary>
        <EvidenceList evidence={result.evidence} />
        <div>대응 방식: {result.responseApproach}</div>
        <div>확인 필요: {result.needsConfirmation ? "예" : "아니오"}</div>
      </details>

      <AnalysisDisclaimer />
      <button type="button" className="analyze-again" onClick={onAnalyzeAgain} disabled={disabled}>
        다시 분석하기
      </button>
    </section>
  );
}
