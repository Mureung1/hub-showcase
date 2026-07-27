const counselingOptions = [
  "대학원 진학 준비",
  "연구 활동 관련",
  "대학원 생활",
  "취업",
  "해외 진학",
];

const academicStatusOptions = ["석사과정", "박사과정", "석박통합과정"];

const MULTI_KEYWORD_HINT = "여러 개의 단어는 쉼표(,)로 구분해서 입력하세요.";

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="17" r="2" />
    </svg>
  );
}

function MentorSearchFilter({
  filters,
  isOpen,
  onChange,
  onReset,
  onSubmit,
  onToggle,
  resultCount,
}) {
  const updateFilter = (event) => {
    const { name, value } = event.target;
    onChange(name, value);
  };

  return (
    <form className="mentor-search-section" aria-label="멘토 검색 및 필터" onSubmit={onSubmit}>
      <div className="mentor-search-bar">
        <div className="mentor-search-input-wrap">
          <label className="sr-only" htmlFor="mentor-search-input">멘토 프로필 검색</label>
          <input
            className="mentor-search-input"
            id="mentor-search-input"
            name="query"
            onChange={updateFilter}
            placeholder="이름, 학교, 연구 분야, 전공 등을 검색하세요"
            type="search"
            value={filters.query}
          />
          <button aria-label="검색 실행" className="mentor-search-icon" type="submit">
            <SearchIcon />
          </button>
        </div>
        <button
          aria-expanded={isOpen}
          aria-controls="mentor-filter-panel"
          aria-label="상세 필터 열기"
          className={`mentor-filter-toggle${isOpen ? " mentor-filter-toggle-active" : ""}`}
          onClick={onToggle}
          type="button"
        >
          <FilterIcon />
        </button>
      </div>

      {isOpen && (
        <div className="card mentor-filter-panel" id="mentor-filter-panel">
          <div className="mentor-filter-header">
            <div>
              <h2 className="card-title">상세 필터</h2>
              <p className="muted-text mentor-filter-description">
                입력한 조건을 모두 만족하는 멘토만 표시됩니다.
              </p>
            </div>
            <button className="button button-neutral mentor-filter-reset" onClick={onReset} type="button">
              초기화
            </button>
          </div>

          <div className="mentor-filter-grid">
            <label className="mentor-filter-field">
              <span>세부 연구 분야</span>
              <small>{MULTI_KEYWORD_HINT}</small>
              <input
                className="field"
                name="researchField"
                onChange={updateFilter}
                placeholder="예: 딥러닝, 로봇공학"
                value={filters.researchField}
              />
            </label>

            <label className="mentor-filter-field">
              <span>상담 분야</span>
              <select className="field" name="counselingField" onChange={updateFilter} value={filters.counselingField}>
                <option value="">전체</option>
                {counselingOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="mentor-filter-field">
              <span>전공</span>
              <small>{MULTI_KEYWORD_HINT}</small>
              <input
                className="field"
                name="major"
                onChange={updateFilter}
                placeholder="예: 재료공학, 화학공학"
                value={filters.major}
              />
            </label>

            <label className="mentor-filter-field">
              <span>학적</span>
              <select className="field" name="academicStatus" onChange={updateFilter} value={filters.academicStatus}>
                <option value="">전체</option>
                {academicStatusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="mentor-filter-field mentor-filter-field-wide">
              <span>연구실</span>
              <small>{MULTI_KEYWORD_HINT}</small>
              <input
                className="field"
                name="lab"
                onChange={updateFilter}
                placeholder="예: 나노소자 연구실, 로봇공학 연구실"
                value={filters.lab}
              />
            </label>
          </div>

          <div className="mentor-filter-footer" aria-live="polite">
            <strong>{resultCount}명</strong>의 멘토가 조건에 맞습니다.
          </div>
        </div>
      )}
    </form>
  );
}

export default MentorSearchFilter;
