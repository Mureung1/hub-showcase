// Step 2·3: 설문 화면. 공부/스트레스 설문이 같은 구조라 한 컴포넌트로 재사용한다.
import { QuestionGroup } from "../ui";

export function StepSurvey({
  stepLabel,
  title,
  description,
  questions,
  answers,
  onAnswer,
  onBack,
  onHome,
  onNext,
  canContinue,
  nextLabel,
}) {
  return (
    <section className="panel">
      <p className="eyebrow">{stepLabel}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      <QuestionGroup answers={answers} onAnswer={onAnswer} questions={questions} />
      <div className="actions">
        <button className="secondary" onClick={onBack} type="button">
          이전
        </button>
        <button className="secondary" onClick={onHome} type="button">
          처음 화면
        </button>
        <button className="primary" disabled={!canContinue} onClick={onNext} type="button">
          {nextLabel}
        </button>
      </div>
    </section>
  );
}
