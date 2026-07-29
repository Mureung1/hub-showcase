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
      </div>

      {/* 뜻과 "모르겠다"를 한 줄에 둔다.
          전에는 "모르겠다"가 숫자 줄만큼 넓어서, 부차적 선택지인데 화면에서 가장 컸다.
          또 뜻은 고른 뒤에야 보여서 고르는 순간에는 4가 보통인지 알 수 없었다.
          안 골랐을 때는 양 끝의 뜻을 미리 보여줘 척도의 방향을 알려준다. */}
      <div className="score-footer">
        <span className="score-meaning">
          {value === UNKNOWN ? (
            "이 항목은 빼고 나머지로 계산해요"
          ) : levelLabels && isKnown ? (
            levelLabels[value - 1]
          ) : levelLabels ? (
            <>
              1 {levelLabels[0]} <span aria-hidden="true">·</span> 7{" "}
              {levelLabels[levelLabels.length - 1]}
            </>
          ) : (
            [minLabel, maxLabel].filter(Boolean).join(" · ")
          )}
        </span>

        <button
          type="button"
          className={`score-unknown${value === UNKNOWN ? " is-selected" : ""}`}
          aria-pressed={value === UNKNOWN}
          onClick={() => onChange(UNKNOWN)}
        >
          모르겠다
        </button>
      </div>
    </div>
  );
}

export default ScoreSelector;
