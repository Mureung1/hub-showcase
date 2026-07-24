const SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

// "모르겠다"를 뜻하는 값. 1~7 로 딱 정하기 어려울 때 고른다.
// 점수 계산에서는 중립(중앙값과 동일)으로 처리해 우선순위에 유리·불리를 주지 않는다.
export const UNKNOWN = 0;

function ScoreSelector({ label, value, onChange, minLabel, maxLabel, levelLabels }) {
  const isKnown = value >= 1 && value <= 7;

  return (
    <div className="form-group">
      <span className="form-label">{label}</span>

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
        <p className="score-hint">잘 모르겠으면 중립으로 계산돼요</p>
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
