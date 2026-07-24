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
        const value = Math.round(breakdown[factor.key]);
        return (
          <div key={factor.key} className="breakdown-row">
            <span className="breakdown-label">{factor.label}</span>
            <span className="breakdown-track">
              <span
                className={`breakdown-fill breakdown-fill-${factor.modifier}`}
                style={{ width: `${value}%` }}
              />
            </span>
            <span className="breakdown-value">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

export default ScoreBreakdown;
