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

  return <div className="coach-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="coach-card reaction-card" role="dialog" aria-modal="true" aria-labelledby="coach-reaction-title">
      <button className="coach-close" type="button" aria-label="코치 반응 닫기" onClick={onClose}>×</button>
      <span className="coach-emoji" aria-hidden="true">✨</span>
      <p className="eyebrow">한 끼 코치</p>
      <h2 id="coach-reaction-title">{reaction.title}</h2>
      <p>{reaction.message}</p>
      <button className="coach-primary" type="button" autoFocus onClick={onContinue}>{recipeName} 레시피 보기</button>
      <button className="coach-secondary" type="button" onClick={onClose}>다른 메뉴 볼게요</button>
    </section>
  </div>;
}
