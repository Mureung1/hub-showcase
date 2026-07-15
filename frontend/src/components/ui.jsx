// 재사용 프레젠테이션 컴포넌트. 상태를 갖지 않고 props만 받는다(과하게 쪼개지 않기 위해 한 파일에 모음).

const STEPS = ["소개", "MBTI", "공부 설문", "스트레스 설문", "결과", "오늘 계획", "실천 카드"];

export function Progress({ step }) {
  return (
    <div className="progress" aria-label="진행 단계">
      {STEPS.map((label, index) => (
        <span className={index <= step ? "progress-dot active" : "progress-dot"} key={label}>
          {label}
        </span>
      ))}
    </div>
  );
}

export function OptionCard({ active, children, onClick }) {
  return (
    <button className={active ? "option-card selected" : "option-card"} onClick={onClick} type="button">
      {children}
    </button>
  );
}

export function QuestionGroup({ answers, onAnswer, questions }) {
  return (
    <div className="question-list">
      {questions.map((question) => (
        <section className="question-card" key={question.id}>
          <p className="eyebrow">{question.title}</p>
          <h3>{question.prompt}</h3>
          <div className="option-grid">
            {question.options.map((option) => (
              <OptionCard
                active={answers[question.id] === option.id}
                key={option.id}
                onClick={() => onAnswer(question.id, option.id)}
              >
                {option.label}
              </OptionCard>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ScoreBar({ label, value }) {
  return (
    <div className="score-row">
      <div>
        <strong>{label}</strong>
        <span>{value}점</span>
      </div>
      <div className="score-track">
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
