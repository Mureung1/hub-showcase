const EXAMPLE_JOB_TITLES = ['반도체 품질관리', '전산직']

function CertSearchForm({ jobTitle, onJobTitleChange, onSubmit, showValidationError }) {
  return (
    <form className="cert-search" onSubmit={onSubmit}>
      <div className="cert-search__eyebrow">
        <span className="cert-search__dot" aria-hidden="true" />
        <span>CERT_PLANNER / INPUT</span>
      </div>

      <h1 className="cert-search__title">목표 직무를 알려주세요</h1>
      <p className="cert-search__subtitle">
        실제 채용공고 데이터를 분석해 진짜 필요한 자격증을 근거와 함께 보여드립니다.
      </p>

      <label
        className={`cert-search__label ${showValidationError ? 'cert-search__label--error' : ''}`}
        htmlFor="cert-search-job-title"
      >
        목표 직무<span className="cert-search__required">*</span>
      </label>
      <input
        id="cert-search-job-title"
        type="text"
        className={`cert-search__input ${showValidationError ? 'cert-search__input--error' : ''}`}
        value={jobTitle}
        onChange={(e) => onJobTitleChange(e.target.value)}
        placeholder="예: 반도체 품질관리, 전산직"
      />
      {showValidationError && (
        <div className="cert-search__error">목표 직무는 필수 입력 항목입니다</div>
      )}

      <div className="cert-search__examples">
        <span className="cert-search__examples-label">지원 중인 직무 예시</span>
        {EXAMPLE_JOB_TITLES.map((title) => (
          <button
            key={title}
            type="button"
            className="cert-search__example-chip"
            onClick={() => onJobTitleChange(title)}
          >
            {title}
          </button>
        ))}
      </div>

      <button type="submit" className="cert-search__submit">
        수요 분석 시작하기 →
      </button>
    </form>
  )
}

export default CertSearchForm
