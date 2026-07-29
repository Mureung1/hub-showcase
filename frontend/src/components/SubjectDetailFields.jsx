import { useState } from "react";
import ScoreSelector from "./ScoreSelector";
import CreditsField from "./CreditsField";
import {
  AVAILABLE_TIME_LEVELS,
  DIFFICULTY_LEVELS,
  GRADING_LEVELS,
  STUDY_AMOUNT_LEVELS,
} from "../utils/scaleLabels";

function toInputValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

// 마지막 글자에 받침이 있으면 "은", 없으면 "는". "점수은(는)" 같은 문구를 피한다.
function withTopicParticle(word) {
  const code = word.charCodeAt(word.length - 1);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  const hasFinalConsonant = isHangul && (code - 0xac00) % 28 !== 0;
  return `${word}${hasFinalConsonant ? "은" : "는"}`;
}

// 3단계(선택). 결과를 이미 본 다음에, 더 정확하게 하고 싶은 과목만 골라서 채운다.
// 전부 기본값이 "모름"이다. 안 채우면 그 요인은 계산에서 빠지고 나머지로만 점수를 낸다.
//
// showStudyAmount: 2단계에서는 공부 분량을 이해도와 함께 앞에서 이미 받으므로 여기서는 감춘다.
// 결과 화면에는 따로 받는 자리가 없어서 그대로 보여준다.
function SubjectDetailFields({ subject, onChange, showStudyAmount = true }) {
  const [gradeWeight, setGradeWeight] = useState(toInputValue(subject.gradeWeight));
  const [previousScore, setPreviousScore] = useState(toInputValue(subject.previousScore));
  const [errorMessage, setErrorMessage] = useState("");

  // 숫자 칸은 글자를 칠 때마다 저장하면 키 입력마다 서버로 나간다. 칸을 벗어날 때 한 번만 저장한다.
  function commitNumber(field, raw, { min, max, integer, emptyValue, label }) {
    if (raw.trim() === "") {
      setErrorMessage("");
      onChange(subject.id, { [field]: emptyValue });
      return;
    }

    const parsed = Number(raw);
    const isValid =
      Number.isFinite(parsed) &&
      (!integer || Number.isInteger(parsed)) &&
      parsed >= min &&
      parsed <= max;

    if (!isValid) {
      setErrorMessage(`${withTopicParticle(label)} ${min}~${max} 사이로 입력해 주세요.`);
      return;
    }

    setErrorMessage("");
    onChange(subject.id, { [field]: parsed });
  }

  return (
    <div className="detail-fields">
      {/* "답할수록 순위가 정확해진다"는 펼치기 전에 보여준다.
          펼친 뒤에 말하면, 펼칠 이유를 펼친 다음에 알려주는 셈이 된다.
          여기에는 실제로 채울 때 필요한 규칙만 남긴다. */}
      <p className="detail-lead">
        모르는 건 비워두거나 &ldquo;모르겠다&rdquo;를 고르면 계산에서 빠져요.
      </p>

      <ScoreSelector
        label="난이도"
        value={subject.difficulty}
        onChange={(value) => onChange(subject.id, { difficulty: value })}
        levelLabels={DIFFICULTY_LEVELS}
      />

      {showStudyAmount && (
        <ScoreSelector
          label="공부 분량 (시험 범위)"
          value={subject.studyAmount}
          onChange={(value) => onChange(subject.id, { studyAmount: value })}
          levelLabels={STUDY_AMOUNT_LEVELS}
        />
      )}

      <ScoreSelector
        label="확보 가능한 공부 시간"
        value={subject.availableTime}
        onChange={(value) => onChange(subject.id, { availableTime: value })}
        levelLabels={AVAILABLE_TIME_LEVELS}
      />

      <ScoreSelector
        label="교수님 학점 성향"
        value={subject.grading}
        onChange={(value) => onChange(subject.id, { grading: value })}
        levelLabels={GRADING_LEVELS}
      />

      <CreditsField subject={subject} onChange={onChange} />

      <div className="form-group">
        <label className="form-label" htmlFor={`gradeWeight-${subject.id}`}>
          성적 반영 비율 (%)
        </label>
        <input
          id={`gradeWeight-${subject.id}`}
          className="form-input"
          type="number"
          min="0"
          max="100"
          inputMode="numeric"
          placeholder="예: 40"
          value={gradeWeight}
          onChange={(event) => setGradeWeight(event.target.value)}
          onBlur={(event) =>
            commitNumber("gradeWeight", event.target.value, {
              min: 0,
              max: 100,
              integer: true,
              emptyValue: null,
              label: "성적 반영 비율",
            })
          }
        />
        <p className="form-hint">이 시험이 성적에서 차지하는 비율이에요. 비우면 계산에서 빠져요.</p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`previousScore-${subject.id}`}>
          이전 시험 점수 (선택)
        </label>
        <input
          id={`previousScore-${subject.id}`}
          className="form-input"
          type="number"
          min="0"
          max="100"
          inputMode="numeric"
          placeholder="예: 85"
          value={previousScore}
          onChange={(event) => setPreviousScore(event.target.value)}
          onBlur={(event) =>
            commitNumber("previousScore", event.target.value, {
              min: 0,
              max: 100,
              integer: true,
              emptyValue: null,
              label: "이전 시험 점수",
            })
          }
        />
        <p className="form-hint">높을수록 이미 잘하는 과목으로 보고 우선순위를 낮춰요.</p>
      </div>

      <p className="form-error" role="alert">
        {errorMessage}
      </p>
    </div>
  );
}

export default SubjectDetailFields;
