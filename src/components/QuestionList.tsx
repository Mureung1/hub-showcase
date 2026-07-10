import type { QuestionItem } from "../types/context";

type QuestionListProps = {
  questions: QuestionItem[];
};

function QuestionList({ questions }: QuestionListProps) {
  return (
    <section className="result-panel" aria-labelledby="question-title">
      <div className="panel-heading compact">
        <p className="section-kicker">Open Questions</p>
        <h2 id="question-title">다음 회의 질문</h2>
      </div>

      {questions.length > 0 ? (
        <ul className="question-list">
          {questions.map((question) => (
            <li key={question.question}>
              <strong>{question.question}</strong>
              <span>{question.reason}</span>
              <small>{question.ownerHint}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="result-empty-state">입력 기록에서 명시적으로 확인된 미결 질문이 없습니다.</p>
      )}
    </section>
  );
}

export default QuestionList;
