import React from "react";

export default function ObservationStatus({ observation }) {
  if (!observation) return null;

  return (
    <section className="observation" aria-labelledby="observation-title">
      <h4 id="observation-title">관찰 상태</h4>
      <ul>
        <li>얼굴 감지: {observation.faceDetected ? "예" : "아니오"}</li>
        <li>시선: {observation.gaze}</li>
        <li>목소리: {observation.voiceTone}</li>
        <li>움직임: {observation.movementLevel}</li>
        <li>신뢰도: {Math.round(observation.confidence * 100)}%</li>
      </ul>
    </section>
  );
}
