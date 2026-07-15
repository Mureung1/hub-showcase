import PriorityBadge from "./PriorityBadge";

function ResultScreen({ subjects, onBack }) {
  const recommendedSubject = subjects[0];

  return (
    <section>
      <div className="recommend-card">
        <p className="recommend-eyebrow">오늘의 추천 과목</p>
        <h2 className="recommend-name">{recommendedSubject.name}</h2>
        <p className="recommend-score">
          우선순위 점수 {recommendedSubject.priorityScore}점
        </p>
        <p className="recommend-reason">
          지금 가장 먼저 공부하면 좋은 과목이에요.
        </p>
      </div>

      <h3 className="subsection-title">등록된 과목</h3>

      <ul className="subject-list">
        {subjects.map((subject, index) => (
          <li key={subject.id} className="subject-item">
            <span className="subject-rank">{index + 1}</span>
            <span className="subject-name">{subject.name}</span>
            <PriorityBadge priorityScore={subject.priorityScore} />
            <span className="subject-score">{subject.priorityScore}점</span>
          </li>
        ))}
      </ul>

      <button type="button" className="button button-secondary" onClick={onBack}>
        다시 입력하기
      </button>
    </section>
  );
}

export default ResultScreen;
