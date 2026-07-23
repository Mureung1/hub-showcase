import { useMemo, useState } from "react";

import { CATEGORY_LABELS, MATCH_STATUS_LABELS } from "../constants/opportunity.js";

const categoryOptions = [
  { id: "all", label: "전체" },
  { id: "scholarship", label: "장학금" },
  { id: "contest", label: "공모전" },
  { id: "activity", label: "대외활동" },
  { id: "volunteer", label: "봉사" },
  { id: "support", label: "지원사업" },
];

const sortOptions = [
  { id: "recent", label: "최근 저장순" },
  { id: "deadline", label: "마감 임박순" },
  { id: "score", label: "추천 점수 높은 순" },
];

function getTimestamp(value, fallback) {
  const timestamp = Date.parse(value || fallback || "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getDeadlineTimestamp(value) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(String(value || ""))) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function sortItems(items, sortMode) {
  return [...items].sort((first, second) => {
    if (sortMode === "deadline") {
      return getDeadlineTimestamp(first.opportunity.deadline) - getDeadlineTimestamp(second.opportunity.deadline);
    }
    if (sortMode === "score") {
      return (second.match.score ?? -1) - (first.match.score ?? -1);
    }
    return getTimestamp(second.persistedAt, second.analyzedAt) - getTimestamp(first.persistedAt, first.analyzedAt);
  });
}

export default function SavedOpportunities({
  errorMessage,
  isConfigured,
  isDeletingId,
  isLoading,
  items,
  onDelete,
  onRefresh,
  onSelect,
  selectedId,
  storageLabel,
}) {
  const [category, setCategory] = useState("all");
  const [sortMode, setSortMode] = useState("recent");
  const visibleItems = useMemo(() => sortItems(
    category === "all" ? items : items.filter((item) => item.opportunity.category === category),
    sortMode,
  ), [category, items, sortMode]);

  return (
    <section className="saved-opportunities-browser" aria-labelledby="saved-opportunities-title">
      <header className="page-panel-heading">
        <div>
          <p className="eyebrow">{storageLabel || "Saved opportunities"}</p>
          <h2 id="saved-opportunities-title">저장한 공고</h2>
          <p>분석 결과를 저장하고 마감일과 추천 근거를 다시 확인할 수 있습니다.</p>
        </div>
        <button className="secondary-button compact-button" disabled={!isConfigured || isLoading} onClick={onRefresh} type="button">
          {isLoading ? "불러오는 중" : "새로고침"}
        </button>
      </header>

      <div className="saved-opportunities-toolbar">
        <div className="saved-category-filter" aria-label="저장 공고 카테고리 필터">
          {categoryOptions.map((option) => (
            <button
              className={category === option.id ? "is-active" : ""}
              key={option.id}
              onClick={() => setCategory(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="saved-sort-control">
          <span>정렬</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            {sortOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {!isConfigured ? (
        <div className="saved-opportunities-empty">
          <strong>저장 기능을 사용하려면 로그인이 필요합니다.</strong>
          <p>로그인하지 않는 로컬 데모에서는 서버의 로컬 SQLite 저장소를 사용합니다.</p>
        </div>
      ) : errorMessage ? (
        <p className="notice-message is-error" role="alert">{errorMessage}</p>
      ) : isLoading && !items.length ? (
        <p className="saved-opportunities-empty" role="status">저장한 공고를 불러오고 있습니다.</p>
      ) : !visibleItems.length ? (
        <div className="saved-opportunities-empty">
          <strong>{items.length ? "조건에 맞는 저장 공고가 없습니다." : "저장한 공고가 아직 없습니다."}</strong>
          <p>공고 분석 결과에서 저장을 누르면 이곳에서 다시 확인할 수 있습니다.</p>
        </div>
      ) : (
        <div className="saved-opportunity-list" role="list">
          {visibleItems.map((item) => {
            const itemId = item.storageId || item.id;
            return (
              <article className={selectedId === itemId ? "is-selected" : ""} key={itemId} role="listitem">
                <div className="saved-opportunity-main">
                  <div className="saved-opportunity-meta">
                    <span className={`category-chip ${item.opportunity.category}`}>
                      {CATEGORY_LABELS[item.opportunity.category]}
                    </span>
                    <span>{item.opportunity.deadline || "마감일 확인 필요"}</span>
                  </div>
                  <h3>{item.opportunity.title || "공고명 확인 필요"}</h3>
                  <p>{item.opportunity.organizer || "주최 기관 확인 필요"}</p>
                  <div className="saved-opportunity-match">
                    <span className={`match-label status-${item.match.status}`}>{MATCH_STATUS_LABELS[item.match.status]}</span>
                    {item.match.score !== null ? <strong>{item.match.score}점</strong> : <span>점수 미산정</span>}
                  </div>
                </div>
                <div className="saved-opportunity-actions">
                  <button className="secondary-button compact-button" onClick={() => onSelect(item)} type="button">상세 보기</button>
                  {item.opportunity.sourceUrl ? (
                    <a className="text-link-button" href={item.opportunity.sourceUrl} rel="noreferrer" target="_blank">원문 열기</a>
                  ) : null}
                  <button
                    className="danger-text-button"
                    disabled={isDeletingId === itemId}
                    onClick={() => onDelete(item)}
                    type="button"
                  >
                    {isDeletingId === itemId ? "삭제 중" : "삭제"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}