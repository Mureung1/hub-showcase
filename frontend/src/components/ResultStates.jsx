// ============================================================================
// components/ResultStates.jsx — 결과 화면의 3가지 "상태" 화면
// ----------------------------------------------------------------------------
// 실제 목록 대신 보여주는 조각들: LoadingState / EmptyState / ErrorState.
// [named export] 한 파일에서 export를 여러 개 두면(=이름있는 내보내기), 쓰는 쪽에서
//   import { LoadingState, EmptyState } 처럼 골라 가져온다(default export는 파일당 1개).
// 셋 다 상태 없는 프레젠테이션 컴포넌트로, SearchResults가 상황에 맞춰 하나를 렌더한다.
// ============================================================================

import SearchIcon from './SearchIcon.jsx';

/** 검색 중: 스피너 + 스켈레톤 카드(프로토타입 results-loading). */
// label에 기본값을 둬서 기존 호출부(<LoadingState />)는 그대로 두고,
// 필요한 화면만 다른 문구를 넘길 수 있게 했다(예: 장소 검색 → "장소를 찾는 중").
export function LoadingState({ label = '검색 중' }) {
  return (
    // role="status"/aria-live: 스크린리더에 "상태가 갱신됨"을 알리는 접근성 속성.
    <div className="loading-wrap" role="status" aria-live="polite">
      <div className="loading-row">
        <span className="spinner" aria-hidden="true" />
        <span>{label}</span>
      </div>
      {/* [스켈레톤 UI] 실제 카드가 오기 전 회색 뼈대를 미리 보여줘 체감 대기시간을 줄인다. */}
      <div className="skeleton-list" aria-hidden="true">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  );
}

/** 결과 없음 / 장소 못 찾음(빈 배열 또는 404): 프로토타입 results-empty. */
// props로 title/sub를 받되 기본 문구 지정 → 상황별로 다른 문구를 넘길 수 있게 유연화.
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

/** 기타 오류: "다시 시도" 버튼 제공(프로토타입 results-error). */
// [콜백 props] onRetry는 부모가 넘긴 "다시 시도 시 실행할 함수". 자식이 부모 로직을 트리거하는 방법.
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
        disabled={isRetrying} // 재시도 중엔 버튼 비활성화(중복 클릭 방지)
      >
        {/* [삼항연산자] 조건 ? 참일때 : 거짓일때 — 상태에 따라 버튼 문구 전환 */}
        {isRetrying ? '다시 시도 중…' : '다시 시도'}
      </button>
    </div>
  );
}
