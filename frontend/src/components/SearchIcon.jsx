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
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default SearchIcon;
