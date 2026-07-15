import { ALL_THEMES } from "./portfolioFilters.js";

export default function PortfolioFilters({
  query,
  themeSlug,
  themes,
  totalCount,
  resultCount,
  onQueryChange,
  onThemeChange,
  onReset,
}) {
  const hasFilter = query.trim().length > 0 || themeSlug !== ALL_THEMES;

  return (
    <div
      className="portfolio-filters"
      role="search"
      aria-label="저장된 포트폴리오 필터"
    >
      <label className="filter-field filter-query">
        <span>이름 또는 직함</span>
        <input
          type="search"
          value={query}
          placeholder="예: 김지우, Frontend"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <label className="filter-field">
        <span>디자인</span>
        <select value={themeSlug} onChange={(event) => onThemeChange(event.target.value)}>
          <option value={ALL_THEMES}>전체 디자인</option>
          {themes.map((theme) => (
            <option key={theme.slug} value={theme.slug}>
              {theme.name}
            </option>
          ))}
        </select>
      </label>

      <div className="filter-summary" aria-live="polite">
        <strong>{resultCount}</strong>
        <span>/ {totalCount}개</span>
      </div>

      <button className="btn filter-reset" onClick={onReset} disabled={!hasFilter}>
        초기화
      </button>
    </div>
  );
}
