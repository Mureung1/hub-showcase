import './WeekTabs.css';

function WeekTabs({ label, canGoPrev, canGoNext, onPrev, onNext }) {
  return (
    <div className="week-tabs">
      <button
        type="button"
        className="week-nav-btn"
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label="이전 주"
      >
        ◀
      </button>
      <span className="week-tabs-label">{label}</span>
      <button
        type="button"
        className="week-nav-btn"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="다음 주"
      >
        ▶
      </button>
    </div>
  );
}

export default WeekTabs;
