import React from "react";
import { emotionDefinitions } from "../../../shared/constants/emotionDefinitions";

export default function EmotionScoreBar({ emotionKey, label, score }) {
  const displayLabel = label || emotionDefinitions[emotionKey]?.label || emotionKey;

  return (
    <div className="emotion-score">
      <div className="emotion-score-heading">
        <span>{displayLabel}</span>
        <strong>{score}%</strong>
      </div>
      <div
        className="emotion-score-track"
        role="progressbar"
        aria-label={`${displayLabel} 가능성`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={score}
      >
        <span className={`emotion-score-fill emotion-score-${emotionKey}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
