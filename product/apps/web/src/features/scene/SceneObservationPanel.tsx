import {
  findSceneObservation,
  type SceneObservation,
  type SceneObservationTime,
} from "./sceneObservations";

type Props = {
  observations: readonly SceneObservation[];
  selectedTime: SceneObservationTime;
  onChange: (time: SceneObservationTime) => void;
};

export function SceneObservationPanel({ observations, selectedTime, onChange }: Props) {
  const selected = findSceneObservation(observations, selectedTime);

  return (
    <section className="scene-time-section" aria-labelledby="scene-observation-title">
      <div>
        <span id="scene-observation-title">시간대별 예상 혼잡도</span>
        <p>{selected.sourceLabel}</p>
      </div>
      <div className="scene-time-buttons" role="group" aria-label="시간대별 혼잡도">
        {observations.map((observation) => (
          <button
            key={observation.time}
            type="button"
            className={selectedTime === observation.time ? "is-selected" : ""}
            aria-pressed={selectedTime === observation.time}
            aria-label={`${observation.time} 혼잡도 보기`}
            onClick={() => onChange(observation.time)}
          >
            {observation.time}
          </button>
        ))}
      </div>
      <div className="scene-observation-summary" aria-live="polite">
        <b>
          {selected.congestionLabel} · 장면 표본 {selected.displayObjectCount}개
        </b>
        <span>{selected.basis}</span>
      </div>
    </section>
  );
}
