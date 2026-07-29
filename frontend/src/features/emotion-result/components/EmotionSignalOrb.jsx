import React from "react";
import { emotionDefinitions } from "../../../shared/constants/emotionDefinitions";

const markerPositions = [
  { left: "23%", top: "30%" },
  { left: "68%", top: "36%" },
  { left: "36%", top: "70%" }
];

function normalizeSignals(result) {
  return (Array.isArray(result?.scores) ? result.scores : [])
    .map((signal) => ({
      key: signal.key,
      label:
        signal.label ||
        emotionDefinitions[signal.key]?.label ||
        signal.key ||
        "감정 신호",
      score: Math.max(0, Math.min(100, Number(signal.score) || 0))
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

export default function EmotionSignalOrb({ result, loading = false }) {
  const signals = normalizeSignals(result);
  const dominantKey = signals[0]?.key || "neutral";

  return (
    <div
      className={`emotion-orb emotion-orb--${dominantKey} ${
        loading ? "emotion-orb--loading" : ""
      }`}
      role="img"
      aria-label={
        signals.length
          ? `상위 감정 신호 참고값: ${signals
              .map((signal) => `${signal.label} ${Math.round(signal.score)}%`)
              .join(", ")}`
          : "분석을 기다리는 감정 신호 오브젝트"
      }
    >
      <div className="emotion-orb__halo" aria-hidden="true" />
      <div className="emotion-orb__sphere" aria-hidden="true">
        <span className="emotion-orb__grid emotion-orb__grid--one" />
        <span className="emotion-orb__grid emotion-orb__grid--two" />
        <span className="emotion-orb__grid emotion-orb__grid--three" />
        {signals.map((signal, index) => (
          <span
            key={signal.key}
            className={`emotion-orb__marker emotion-orb__marker--${index + 1}`}
            style={markerPositions[index]}
            title={`${signal.label} 가능성 ${Math.round(signal.score)}%`}
          />
        ))}
      </div>
      <span className="emotion-orb__shadow" aria-hidden="true" />
    </div>
  );
}

