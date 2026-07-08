type QuestionListProps = {
  questions: string[];
};

function QuestionList({ questions }: QuestionListProps) {
  return (
    <section className="result-panel" aria-labelledby="question-title">
      <div className="panel-heading compact">
        <p className="section-kicker">Open Questions</p>
        <h2 id="question-title">다음 회의 질문</h2>
      </div>

      <ul className="question-list">
        {questions.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
    </section>
  );
}

export default QuestionList;
