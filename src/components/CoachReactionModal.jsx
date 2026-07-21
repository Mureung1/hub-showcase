import { useEffect } from "react";

export default function CoachReactionModal({ reaction, recipeName, onContinue, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return <div className="modal-backdrop coach-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="coach-card reaction-card" role="dialog" aria-modal="true" aria-labelledby="coach-reaction-title">
      <div className="coach-heading">
        <span className="coach-icon" aria-hidden="true">✨</span>
        <button className="modal-close" type="button" aria-label="코치 반응 닫기" onClick={onClose}>×</button>
      </div>
      <p className="eyebrow">한 끼 코치</p>
      <h2 id="coach-reaction-title">{reaction.title}</h2>
      <p className="coach-message">{reaction.message}</p>
      <div className="coach-actions">
        <button className="coach-primary" type="button" autoFocus onClick={onContinue}>{recipeName} 레시피 보기</button>
        <button className="coach-secondary" type="button" onClick={onClose}>다른 메뉴 볼게요</button>
      </div>
      <p className="coach-note">선택한 메뉴의 상세 레시피로 이동할 수 있어요.</p>
    </section>
  </div>;
}
