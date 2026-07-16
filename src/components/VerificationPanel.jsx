function VerificationPanel({ health, lastAction }) {
  const healthy = health?.status === "ok";
  return (
    <section className="verification-panel" aria-label="기능 검증 상태">
      <div><span className={healthy ? "status-dot ok" : "status-dot"} /><strong>{healthy ? "Express 연결됨" : "API 연결 확인 중"}</strong><small>{health?.label ?? "서버 상태를 확인하고 있어요"}</small></div>
      <div><span className={lastAction?.ok ? "status-dot ok" : "status-dot idle"} /><strong>마지막 REST 요청</strong><small>{lastAction?.message ?? "아직 실행된 요청이 없습니다"}</small></div>
      <div><span className="method-stack"><b>GET</b><b>POST</b><b>PATCH</b><b>DELETE</b></span><strong>한 테이블 CRUD</strong><small>발표용 수직 슬라이스</small></div>
    </section>
  );
}

export default VerificationPanel;
