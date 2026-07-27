import { UNKNOWN } from "../utils/scaleLabels";

const SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export { UNKNOWN };

// hideLabel: 바깥에서 이미 제목을 보여주는 경우(2단계의 과목별 줄) 라벨을 눈에서만 감춘다.
// 스크린리더에는 그대로 읽혀야 해서 지우지 않고 sr-only 로 남긴다.
function ScoreSelector({
  label,
  value,
  onChange,
  minLabel,
  maxLabel,
  levelLabels,
  hideLabel = false,
}) {
  const isKnown = value >= 1 && value <= 7;

  return (
    <div className="form-group">
      <span className={hideLabel ? "sr-only" : "form-label"}>{label}</span>

      <div className="score-selector" role="group" aria-label={label}>
        {SCORE_OPTIONS.map((score) => (
          <button
            key={score}
            type="button"
            className={`score-option${value === score ? " is-selected" : ""}`}
            aria-pressed={value === score}
            onClick={() => onChange(score)}
          >
            {score}
          </button>
        ))}
        <button
          type="button"
          className={`score-option score-option-unknown${
            value === UNKNOWN ? " is-selected" : ""
          }`}
          aria-pressed={value === UNKNOWN}
          onClick={() => onChange(UNKNOWN)}
        >
          모르겠다
        </button>
      </div>

      {value === UNKNOWN ? (
        <p className="score-hint">이 항목은 빼고 나머지로 계산해요</p>
      ) : levelLabels && isKnown ? (
        // 선택한 단계의 뜻을 한 줄로 보여줘 "3"이 무슨 의미인지 기준을 잡아준다.
        <p className="score-hint">{levelLabels[value - 1]}</p>
      ) : (
        (minLabel || maxLabel) && (
          <div className="score-scale">
            <span>{minLabel}</span>
            <span>{maxLabel}</span>
          </div>
        )
      )}
    </div>
  );
}

export default ScoreSelector;
