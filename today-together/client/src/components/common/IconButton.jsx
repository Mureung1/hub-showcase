// 우측 상단 메뉴, 닫기, 나가기 등 아이콘형 버튼 공통 컴포넌트

export default function IconButton({ children, onClick, label, className = "" }) {
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </button>
  );
}
