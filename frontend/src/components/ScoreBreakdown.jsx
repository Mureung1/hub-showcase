import { getDaysUntil } from "../utils/daysUntil";
import { getScoreBreakdown } from "../utils/priorityCalculator";

const FACTORS = [
  { key: "understanding", label: "이해도", modifier: "understanding" },
  { key: "difficulty", label: "난이도", modifier: "difficulty" },
  { key: "urgency", label: "급함", modifier: "urgency" },
  { key: "gradeWeight", label: "성적", modifier: "gradeWeight" },
  { key: "grading", label: "교수", modifier: "grading" },
  { key: "studyAmount", label: "분량", modifier: "studyAmount" },
  { key: "availableTime", label: "시간", modifier: "availableTime" },
  { key: "previousScore", label: "이전", modifier: "previousScore" },
];

function ScoreBreakdown({ subject }) {
  const breakdown = getScoreBreakdown({
    understanding: subject.understanding,
    difficulty: subject.difficulty,
    daysUntil: getDaysUntil(subject.examDate),
    gradeWeight: subject.gradeWeight,
    grading: subject.grading,
    studyAmount: subject.studyAmount,
    availableTime: subject.availableTime,
    previousScore: subject.previousScore,
  });

  return (
    <div className="score-breakdown">
      {FACTORS.map((factor) => {
        const raw = breakdown[factor.key];
        // 모르는 요인(null)은 점수 계산에서 빠진다. 막대 없이 "모름"으로 표시한다.
        const isUnknown = raw === null;
        const value = isUnknown ? 0 : Math.round(raw);
        return (
          <div key={factor.key} className="breakdown-row">
            <span className="breakdown-label">{factor.label}</span>
            <span className="breakdown-track">
              {!isUnknown && (
                <span
                  className={`breakdown-fill breakdown-fill-${factor.modifier}`}
                  style={{ width: `${value}%` }}
                />
              )}
            </span>
            <span className={`breakdown-value${isUnknown ? " is-unknown" : ""}`}>
              {isUnknown ? "모름" : value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default ScoreBreakdown;
