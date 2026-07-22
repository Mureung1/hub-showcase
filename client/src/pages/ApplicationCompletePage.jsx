function SuccessIcon() {
  return (
    <div className="application-complete-icon" aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <path d="m17 33 10 10 21-22" />
      </svg>
    </div>
  );
}

function ApplicationCompletePage() {
  return (
    <main className="application-complete-page">
      <section className="card application-complete-card" aria-labelledby="application-complete-title">
        <SuccessIcon />
        <div className="application-complete-copy">
          <p className="eyebrow">APPLICATION COMPLETE</p>
          <h1 className="page-title" id="application-complete-title">
            면담 신청이 완료되었습니다.
          </h1>
          <p className="body-text">선택한 멘토에게 신청 내용이 전달되었습니다.</p>
          <p className="muted-text">마이페이지에서 면담 신청의 진행 상태를 확인할 수 있습니다.</p>
        </div>
      </section>
    </main>
  );
}

export default ApplicationCompletePage;
