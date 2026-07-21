// ============================================================================
// components/SearchIcon.jsx — 검색 돋보기 아이콘(SVG)
// ----------------------------------------------------------------------------
// [SVG in JSX] SVG는 코드로 그리는 벡터 그림(확대해도 안 깨짐). JSX 안에 그대로 쓸 수 있고,
//   size props로 크기를 바꿔 여러 곳에서 재사용한다(검색창 18px, 빈 상태 아이콘 30px).
// ============================================================================

/**
 * 검색 돋보기 아이콘. 장식용이므로 aria-hidden 처리한다.
 * 색은 부모 요소의 currentColor 를 따른다.
 */
function SearchIcon({ size = 18 }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"    // 내부 좌표계(0~24). 실제 표시 크기(width/height)와 분리돼 확대해도 선명.
      fill="none"
      stroke="currentColor"  // 선 색을 부모의 글자색(currentColor)에 맞춤 → CSS로 색 제어 가능
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />               {/* 돋보기 렌즈(원) */}
      <line x1="21" y1="21" x2="16.65" y2="16.65" /> {/* 돋보기 손잡이(선) */}
    </svg>
  );
}

export default SearchIcon;
