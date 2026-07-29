import { formatDday, getDaysUntil } from "../utils/daysUntil";

// 공부를 끝낸 과목 목록.
// "공부 끝"을 누르면 활성 목록에서 사라지는데, 어디로 갔는지 볼 데가 없으면
// 실수로 눌렀을 때 되돌릴 방법이 없다.
function DoneList({ subjects, onUncomplete, onBack }) {
  return (
    <section>
      <div className="card">
        <h2 className="section-title">공부를 끝낸 과목</h2>

        {subjects.length > 0 ? (
          <ul className="done-list">
            {subjects.map((subject) => (
              <li key={subject.id} className="done-item">
                <div className="done-main">
                  <span className="done-name">{subject.name}</span>
                  <span className="done-meta">
                    시험 {subject.examDate} · {formatDday(getDaysUntil(subject.examDate))}
                  </span>
                </div>
                <button
                  type="button"
                  className="entry-action"
                  onClick={() => onUncomplete(subject.id)}
                >
                  다시 담기
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-hint">
            아직 끝낸 과목이 없어요. 결과 화면에서 &ldquo;공부 끝&rdquo;을 누르면 여기로 와요.
          </p>
        )}
      </div>

      <div className="form-actions">
        <button type="button" className="button button-ghost" onClick={onBack}>
          ← 결과로 돌아가기
        </button>
      </div>
    </section>
  );
}

export default DoneList;
