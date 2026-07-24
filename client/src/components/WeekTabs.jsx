import './WeekTabs.css';

function WeekTabs({ weekOffset, onSelectWeek }) {
  return (
    <div className="week-tabs">
      <button
        type="button"
        className={`week-tab${weekOffset === 0 ? ' active' : ''}`}
        onClick={() => onSelectWeek(0)}
      >
        이번 주
      </button>
      <button
        type="button"
        className={`week-tab${weekOffset === 1 ? ' active' : ''}`}
        onClick={() => onSelectWeek(1)}
      >
        다음 주
      </button>
    </div>
  );
}

export default WeekTabs;
