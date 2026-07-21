function RecommendList({ jobs, onSelectJob, onBack }) {
  return (
    <section className="card">
      <p className="eyebrow">STEP 2</p>
      <h1>회원님을 위한 추천 공고</h1>
      <p className="subtitle">
        {jobs.length > 0
          ? `입력한 전공·취득학점·평균평점·자격증·경험을 바탕으로 ${jobs.length}건을 추천했어요.`
          : '입력하신 조건에 맞는 공고를 찾지 못했어요.'}
      </p>

      {jobs.length > 0 ? (
        <div className="job-list">
          {jobs.map((job) => (
            <button type="button" className="job-card" key={job.id} onClick={() => onSelectJob(job)}>
              <p className="org">
                {job.org} · {job.category}
              </p>
              <h3>{job.title}</h3>
              <p className="deadline">마감일: {job.deadline}</p>
              <span className="tag tag--primary">{job.reasonShort}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="info-box info-box--primary">정보를 다시 입력해 조건을 조정해보세요.</p>
      )}

      <div className="actions">
        <button type="button" className="btn-link" onClick={onBack}>
          ← 정보 다시 입력하기
        </button>
      </div>
    </section>
  );
}

export default RecommendList;
