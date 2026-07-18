import SearchIcon from './SearchIcon.jsx';

/** 검색 중: 스피너 + 스켈레톤 카드(프로토타입 results-loading). */
export function LoadingState() {
  return (
    <div className="loading-wrap" role="status" aria-live="polite">
      <div className="loading-row">
        <span className="spinner" aria-hidden="true" />
        <span>검색 중</span>
      </div>
      <div className="skeleton-list" aria-hidden="true">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  );
}

/** 결과 없음/장소 못 찾음(빈 배열 또는 404): 프로토타입 results-empty. */
export function EmptyState({
  title = '주변에 공영주차장을 찾지 못했어요',
  sub = '다른 목적지로 검색해 보세요',
}) {
  return (
    <div className="state">
      <div className="state-icon">
        <SearchIcon size={30} />
      </div>
      <div className="state-title">{title}</div>
      <div className="state-sub">{sub}</div>
    </div>
  );
}

/** 기타 오류: 다시 시도 버튼 제공(프로토타입 results-error). */
export function ErrorState({ onRetry, isRetrying = false }) {
  return (
    <div className="state">
      <div className="state-icon state-icon--busy" aria-hidden="true">
        !
      </div>
      <div className="state-title">일시적인 오류가 발생했어요</div>
      <div className="state-sub">잠시 후 다시 시도해 주세요</div>
      <button
        type="button"
        className="btn-primary"
        onClick={onRetry}
        disabled={isRetrying}
      >
        {isRetrying ? '다시 시도 중…' : '다시 시도'}
      </button>
    </div>
  );
}
