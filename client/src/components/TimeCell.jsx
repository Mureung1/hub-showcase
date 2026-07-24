import './TimeCell.css';

function TimeCell({ isSelected, onClick }) {
  return (
    <button
      type="button"
      className={`time-cell${isSelected ? ' selected' : ''}`}
      onClick={onClick}
      aria-pressed={isSelected}
    />
  );
}

export default TimeCell;
