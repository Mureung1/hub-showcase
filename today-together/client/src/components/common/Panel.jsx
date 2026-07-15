// 정보 패널 / 생성 모달 등에 공통으로 쓰는 카드 틀
// title은 선택. 명시적으로 헤더 타이틀이 필요 없는 화면(예: 모임 정보 패널)에서는 생략.

export default function Panel({ title, onClose, children, className = "" }) {
  return (
    <div className={`panel ${className}`}>
      {onClose && (
        <button type="button" className="panel__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      )}
      {title && <p className="panel__title">{title}</p>}
      {children}
    </div>
  );
}
