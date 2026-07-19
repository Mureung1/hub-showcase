// 연습 1회차 — 빈칸 3개
// 답지: client/src/components/SummaryCard.jsx

// 힌트: 부모(App)가 넘겨주는 props 4개를 구조분해로 받는다 — icon, title, value, onChange
function SummaryCard(/* TODO: ___ */) {
  return (
    <label className="summary-card">
      <span className="summary-title"><span aria-hidden="true">{icon}</span>{title}</span>
      {/* 힌트: 보여줄 값은 props로 받은 value, 입력이 바뀌면 event.target.value를 onChange에 넘긴다 */}
      <textarea
        value={/* TODO: ___ */}
        onChange={(event) => /* TODO: ___ */}
        aria-label={title}
      />
    </label>
  )
}

export default SummaryCard
