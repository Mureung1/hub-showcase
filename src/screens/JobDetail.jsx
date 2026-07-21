function JobDetail({ job, onBack, onGenerateDraft, isGeneratingDraft, draftError }) {
  return (
    <section className="card">
      <p className="eyebrow">STEP 3</p>
      <h1>{job.title}</h1>
      <p className="subtitle">
        {job.org} · 마감일 {job.deadline}
      </p>

      <div className="section">
        <h2>기본 정보</h2>
        <ul className="meta-list">
          <li>주최: {job.org}</li>
          <li>분야: {job.field}</li>
          <li>지원 대상: {job.target}</li>
          <li>접수 방법: {job.applyMethod}</li>
        </ul>
      </div>

      <div className="section">
        <h2>추천 이유</h2>
        <p className="info-box info-box--primary">{job.reasonDetail}</p>
      </div>

      <div className="section">
        <h2>주요 조건</h2>
        <ul className="condition-list">
          {job.conditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
          <li>자기소개서 문항 {job.essayQuestions.length}개 제출 필수</li>
        </ul>
      </div>

      {draftError && <p className="error-text">{draftError}</p>}

      <div className="actions">
        <button type="button" className="btn-link" onClick={onBack} disabled={isGeneratingDraft}>
          ← 목록으로 돌아가기
        </button>
        <button type="button" className="btn-primary" onClick={() => onGenerateDraft(job)} disabled={isGeneratingDraft}>
          {isGeneratingDraft ? '초안을 준비하는 중...' : '자소서 초안 생성'}
        </button>
      </div>
    </section>
  );
}

export default JobDetail;
