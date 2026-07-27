import { getDaysUntil, formatDday } from "../utils/daysUntil";
import { buildPriorityReason } from "../utils/priorityReason";

// 넓은 화면에서 입력 옆에 붙어 있는 읽기 전용 순위판.
// 답을 하나 채울 때마다 순위가 바뀌는 걸 눈으로 보게 해서,
// "답할수록 정확해져요" 를 말이 아니라 화면으로 보여준다.
//
// 결과 단계에서는 왼쪽에 같은 내용이 전부 나오므로 이 판을 띄우지 않는다. (App.jsx 참고)
function ResultSummary({ subjects, weightKey }) {
  const ranked = [...subjects].sort((a, b) => b.priorityScore - a.priorityScore);
  const top = ranked[0];

  if (!top) {
    return null;
  }

  return (
    <aside className="result-summary" aria-label="지금까지의 우선순위">
      <p className="summary-eyebrow">지금 순위</p>

      <div className="summary-top">
        <span className="summary-top-name">{top.name}</span>
        <span className="summary-top-score">{top.priorityScore}점</span>
      </div>
      <p className="summary-reason">{buildPriorityReason(top, weightKey)}</p>

      <ol className="summary-list">
        {ranked.map((subject, index) => (
          <li key={subject.id} className="summary-item">
            <span className="summary-rank">{index + 1}</span>
            <span className="summary-name">{subject.name}</span>
            <span className="summary-dday">
              {formatDday(getDaysUntil(subject.examDate))}
            </span>
            {/* 좁은 판에서는 배지(높음/중간/낮음)가 대체로 같은 값이라 아무것도 구분해 주지 못한다.
                73/63/50 처럼 숫자가 있어야 답을 채울 때 순위가 움직이는 게 보인다.
                배지는 자리가 넉넉한 결과 화면에 그대로 둔다. */}
            <span className="summary-score">{subject.priorityScore}</span>
          </li>
        ))}
      </ol>

      <p className="summary-note">답을 채울 때마다 순위가 바로 바뀌어요.</p>
    </aside>
  );
}

export default ResultSummary;
