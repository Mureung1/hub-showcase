// Step 5: 과제(task)·상태(state) 입력 — MBTI+전략을 먼저 보여준 뒤(Step 4),
// 오늘 무엇을·마감·가용시간을 물어 진짜 "task/state" baseline을 만든다(§C-1a).
// 선택 입력이다: 건너뛰어도 이전 단계의 행동·상태 기반 추천을 그대로 쓸 수 있다.
import { DEADLINE_OPTIONS, TASK_TYPE_OPTIONS, TIME_OPTIONS } from "../../data/taskState";
import { OptionCard } from "../ui";

export function StepTaskState({
  taskType,
  setTaskType,
  deadline,
  setDeadline,
  availableMinutes,
  setAvailableMinutes,
  hasTaskState,
  baselineTitles,
  taskStateTitles,
  onBack,
  onNext,
}) {
  const changed = hasTaskState && baselineTitles.join("|") !== taskStateTitles.join("|");

  return (
    <section className="panel">
      <p className="eyebrow">Step 5</p>
      <h2>오늘 무엇을, 언제까지, 얼마나</h2>
      <p>세 가지만 답하면 baseline이 "행동·상태" 수준을 넘어 오늘의 실제 과제(task)·상태(state) 기준으로 바뀝니다. 건너뛰어도 됩니다.</p>

      <div className="question-list">
        <section className="question-card">
          <p className="eyebrow">과제유형</p>
          <h3>오늘 주로 무엇을 하나요?</h3>
          <div className="option-grid">
            {TASK_TYPE_OPTIONS.map((option) => (
              <OptionCard active={taskType === option.id} key={option.id} onClick={() => setTaskType(option.id)}>
                {option.label}
              </OptionCard>
            ))}
          </div>
        </section>
        <section className="question-card">
          <p className="eyebrow">마감</p>
          <h3>언제까지 필요한가요?</h3>
          <div className="option-grid">
            {DEADLINE_OPTIONS.map((option) => (
              <OptionCard active={deadline === option.id} key={option.id} onClick={() => setDeadline(option.id)}>
                {option.label}
              </OptionCard>
            ))}
          </div>
        </section>
        <section className="question-card">
          <p className="eyebrow">가용시간</p>
          <h3>지금 얼마나 쓸 수 있나요?</h3>
          <div className="option-grid">
            {TIME_OPTIONS.map((option) => (
              <OptionCard
                active={availableMinutes === option.minutes}
                key={option.id}
                onClick={() => setAvailableMinutes(option.minutes)}
              >
                {option.label}
              </OptionCard>
            ))}
          </div>
        </section>
      </div>

      {hasTaskState && (
        <div className="feedback-card">
          <p className="eyebrow">Task/state baseline</p>
          <h3>오늘 입력을 반영한 진짜 baseline입니다</h3>
          <p className="hint">
            {changed
              ? "과제·마감을 반영하자 추천 순서가 바뀌었습니다. 이것이 지금부터의 baseline(무-MBTI)입니다."
              : "이번 입력에서는 순서가 크게 바뀌지 않았지만, 이 baseline은 이제 과제·마감을 반영한 값입니다."}
          </p>
          <div className="signal-grid">
            <div className="signal-item">
              <strong>이전 baseline(행동·상태만)</strong>
              <span>{baselineTitles.join(" → ")}</span>
            </div>
            <div className="signal-item">
              <strong>task/state baseline</strong>
              <span>{taskStateTitles.join(" → ")}</span>
            </div>
          </div>
        </div>
      )}

      <div className="actions">
        <button className="secondary" onClick={onBack} type="button">
          이전
        </button>
        <button className="primary" onClick={onNext} type="button">
          {hasTaskState ? "오늘의 실천 카드 보기" : "건너뛰고 실천 카드 보기"}
        </button>
      </div>
    </section>
  );
}
