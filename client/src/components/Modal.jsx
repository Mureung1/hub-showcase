// 로그인/회원가입/코스저장 등 모든 모달이 공유하는 오버레이 래퍼. design.md: modal-wrap + modal 클래스 재사용.
export default function Modal({ open, onClose, children, width }) {
  return (
    <div
      className={`modal-wrap${open ? ' show' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modal" style={width ? { width } : undefined}>
        {children}
      </div>
    </div>
  );
}
