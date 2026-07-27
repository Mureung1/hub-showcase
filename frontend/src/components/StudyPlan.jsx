import { buildStudyPlan, formatMinutes } from "../utils/studyPlan";
import { formatDday } from "../utils/daysUntil";

// 순위는 "어느 과목부터"까지만 답한다. 바로 다음 질문이 "그래서 각각 얼마나"라서
// 오늘 쓸 수 있는 시간을 점수 비율로 나눠 보여준다.
function StudyPlan({ subjects, hours, onChangeHours }) {
  const parsed = Number(hours);
  const totalMinutes = Number.isFinite(parsed) ? Math.round(parsed * 60) : 0;
  const plan = buildStudyPlan(subjects, totalMinutes);
  const urgentSkipped = plan.skipped.filter((subject) => subject.isSoon);

  return (
    <div className="card study-plan">
      <h2 className="section-title">오늘 이렇게 나눠보세요</h2>

      <div className="form-group plan-hours">
        <label className="form-label" htmlFor="planHours">
          오늘 쓸 수 있는 시간
        </label>
        <div className="plan-hours-row">
          <input
            id="planHours"
            className="form-input"
            type="number"
            min="0.5"
            max="24"
            step="0.5"
            inputMode="decimal"
            value={hours}
            onChange={(event) => onChangeHours(event.target.value)}
          />
          <span className="plan-hours-unit">시간</span>
        </div>
      </div>

      {plan.blocks.length > 0 ? (
        <ul className="plan-list">
          {plan.blocks.map((block) => (
            <li key={block.id} className="plan-item">
              <span className="plan-name">{block.name}</span>
              <span className="plan-minutes">{formatMinutes(block.minutes)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-hint">
          시간을 {Math.round(totalMinutes)}분으로 두면 나눌 수가 없어요. 30분 이상으로
          늘려 보세요.
        </p>
      )}

      {plan.skipped.length > 0 && (
        <div className="plan-skipped">
          {urgentSkipped.length > 0 ? (
            // 잘게 흩뿌리지 않으려고 뺐지만, 시험이 코앞이면 조용히 지우면 안 된다.
            // 과목명 뒤에 조사를 붙이면 이름에 따라 은/는이 달라져서, 문장을 콜론으로 끊는다.
            <p className="form-hint is-warning">
              시험이 곧인데 오늘 배분에서 빠진 과목:{" "}
              {urgentSkipped.map((s) => `${s.name}(${formatDday(s.daysUntil)})`).join(", ")}
              . 시간을 늘리거나 따로 챙기세요.
            </p>
          ) : (
            <p className="form-hint">
              오늘 건너뛰어도 괜찮은 과목:{" "}
              {plan.skipped.map((s) => `${s.name}(${formatDday(s.daysUntil)})`).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default StudyPlan;
