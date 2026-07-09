// 냉장고/홈/임박알림/가격정보 화면에서 반복되는 "이모지 + 이름/메타 + 우측 뱃지" 한 줄.
export default function Row({ emoji, name, nameColor, meta, right, onClick }) {
  return (
    <div className={`row${onClick ? ' tap' : ''}`} onClick={onClick}>
      <div className="emoji">{emoji}</div>
      <div className="info">
        <div className="name" style={nameColor ? { color: nameColor } : undefined}>{name}</div>
        {meta && <div className="meta">{meta}</div>}
      </div>
      {right && <div className="right">{right}</div>}
    </div>
  );
}
