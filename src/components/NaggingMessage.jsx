import { useEffect } from "react";

export default function NaggingMessage({ message, onAcceptSuggestion, onContinueOriginal, onClose }) {
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
    <section className="coach-card" role="dialog" aria-modal="true" aria-labelledby="coach-title" aria-describedby="coach-message">
      <div className="coach-heading">
        <span className="coach-icon" aria-hidden="true">🍜</span>
        <button className="modal-close" type="button" aria-label="잔소리 메시지 닫기" onClick={onClose}>×</button>
      </div>
      <p className="eyebrow">한 끼 코치</p>
      <h2 id="coach-title">{message.title}</h2>
      <p id="coach-message" className="coach-message">{message.message}</p>
      {message.suggestedIngredients.length > 0 && <div className="coach-suggestions" aria-label="추천 보완 재료">{message.suggestedIngredients.map((ingredient) => <span key={ingredient.id}>{ingredient.icon} {ingredient.name}</span>)}</div>}
      <div className="coach-actions">
        {message.primaryAction && <button className="coach-primary" type="button" onClick={onAcceptSuggestion}>{message.primaryAction.label}</button>}
        <button className="coach-secondary" type="button" onClick={onContinueOriginal}>{message.secondaryAction.label}</button>
      </div>
      <p className="coach-note">선택을 막지 않아요. 오늘 먹기 좋은 쪽을 골라보세요.</p>
    </section>
  </div>;
}

