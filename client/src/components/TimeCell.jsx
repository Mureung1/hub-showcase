import './TimeCell.css';

function TimeCell({ level, count, names, isMine, isHighlighted, onClick }) {
  const title = count === 0 ? '가능한 사람이 없어요' : `${count}명 가능 (${names.join(', ')})`;

  return (
    <button
      type="button"
      className={`time-cell level-${level}${isMine ? ' mine' : ''}${isHighlighted ? ' highlight' : ''}`}
      onClick={onClick}
      title={title}
      aria-pressed={isMine}
    />
  );
}

export default TimeCell;
