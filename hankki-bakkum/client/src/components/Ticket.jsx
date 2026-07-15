import './ticket.css';

// 보상(식사권)이 등장하는 모든 지점에서 재사용하는 시그니처 컴포넌트
// dim: 사용 완료·비활성 상태
export default function Ticket({ count, label, dim = false }) {
  return (
    <div className={`ticket${dim ? ' dim' : ''}`}>
      <div className="stub">🎟️ {count}장</div>
      <div className="body">{label}</div>
    </div>
  );
}