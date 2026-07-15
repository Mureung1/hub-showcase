function ResultScreen({ subjects, onBack }) {
  const recommendedSubject = subjects[0];

  return (
    <section>
      <h2>오늘의 추천 과목</h2>

      <div>
        <strong>{recommendedSubject.name}</strong>
        <p>우선순위 점수: {recommendedSubject.priorityScore}점</p>
      </div>

      <h3>등록된 과목</h3>

      <ul>
        {subjects.map((subject) => (
          <li key={subject.id}>
            {subject.name} · {subject.priorityScore}점
          </li>
        ))}
      </ul>

      <button type="button" onClick={onBack}>
        다시 입력하기
      </button>
    </section>
  );
}

export default ResultScreen;