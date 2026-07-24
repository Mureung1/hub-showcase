import "./jobTarget.css";

export default function JobTargetSelect({ postings, selectedId, onSelect }) {
  const selected = postings.find((posting) => posting.id === selectedId);

  return (
    <section className="job-target" aria-labelledby="job-target-title">
      <div className="job-target-heading">
        <div>
          <p className="eyebrow">STEP 1 · TARGET</p>
          <h2 id="job-target-title">어느 기업에 지원할까요?</h2>
          <p>
            기업과 채용 공고를 먼저 고르면, 이력서에 있는 경험을 JD에 맞는 순서와
            표현으로 재구성합니다.
          </p>
        </div>
        <span className="source-badge">공식 채용 공고 5개</span>
      </div>

      <div className="job-card-grid" aria-label="채용 공고 예시">
        {postings.map((posting) => {
          const isSelected = posting.id === selectedId;
          return (
            <button
              key={posting.id}
              type="button"
              className={`job-card ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(posting.id)}
              aria-pressed={isSelected}
            >
              <span className="company-mark" aria-hidden="true">
                {posting.company.slice(0, 1)}
              </span>
              <span className="job-card-copy">
                <strong>{posting.company}</strong>
                <span>{posting.role}</span>
                <small>{posting.talentKeywords.slice(0, 2).join(" · ")}</small>
              </span>
              <span className="select-mark" aria-hidden="true">
                {isSelected ? "✓" : "→"}
              </span>
            </button>
          );
        })}
      </div>

      {selected ? (
        <article className="job-detail">
          <div className="job-detail-title">
            <div>
              <p className="eyebrow">SELECTED JOB</p>
              <h3>
                {selected.company} · {selected.role}
              </h3>
              <p>{selected.companySummary}</p>
            </div>
            <a href={selected.sourceUrl} target="_blank" rel="noreferrer">
              공식 공고 보기 ↗
            </a>
          </div>

          <div className="job-detail-grid">
            <div>
              <h4>인재상 키워드</h4>
              <div className="keyword-list">
                {selected.talentKeywords.map((keyword) => (
                  <span key={keyword}>{keyword}</span>
                ))}
              </div>
            </div>
            <div>
              <h4>JD 핵심 업무</h4>
              <ul>
                {selected.responsibilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="portfolio-focus">
              <h4>포트폴리오 강조점</h4>
              <ul>
                {selected.portfolioFocus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="job-source-note">
            공고 확인일 {selected.checkedAt} · 채용 공고는 변경되거나 마감될 수 있습니다.
            생성 과정은 CV에 없는 경험을 추가하지 않고 기존 근거만 재배치합니다.
          </p>
        </article>
      ) : (
        <div className="job-empty" role="status">
          위 공고 중 하나를 선택하면 JD 요약과 포트폴리오 강조점을 볼 수 있습니다.
        </div>
      )}
    </section>
  );
}
