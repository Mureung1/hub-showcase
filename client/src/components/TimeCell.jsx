import './TimeCell.css';

function TimeCell({ level, count, names, isMine, isHighlighted, onClick, onMouseDown, onMouseEnter }) {
  const title = count === 0 ? '가능한 사람이 없어요' : `${count}명 가능 (${names.join(', ')})`;

  // 드래그 중 브라우저가 텍스트/셀을 선택하려는 기본 동작을 막아야 드래그가 매끄럽게 동작함
  function handleMouseDown(e) {
    e.preventDefault();
    onMouseDown();
  }

  return (
    <button
      type="button"
      className={`time-cell level-${level}${isMine ? ' mine' : ''}${isHighlighted ? ' highlight' : ''}`}
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={onMouseEnter}
      title={title}
      aria-pressed={isMine}
    />
  );
}

export default TimeCell;
