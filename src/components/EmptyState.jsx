import "./EmptyState.css";

function EmptyState({ message, actionLabel }) {
  return (
    <div className="empty-state">
      {message}
      <div>
        {/* 지금은 라우팅이 없어서 클릭 동작 없음 — /register 라우트 붙을 때 연결 */}
        <button className="btn btn-primary">{actionLabel}</button>
      </div>
    </div>
  );
}

export default EmptyState;
