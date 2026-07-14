import { daysLeft, ddayLabel } from "../deadline";

const STATUS_LABEL = {
  eligible: "지원 가능",
  review: "확인 필요",
  near: "거의 가능 (조건 하나만 맞추면)",
  ineligible: "지원 불가",
};

// 공고 하나의 상세. 오버레이를 누르거나 X로 닫는다.
export default function DetailModal({ item, fav, onToggleFav, onClose }) {
  if (!item) return null;
  const urgent = daysLeft(item.deadline) <= 7;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="닫기">×</button>

        <div className="modal-top">
          <span className={"tag tag-" + item.category}>{item.category}</span>
          <span className={"dday" + (urgent ? " urgent" : "")}>{ddayLabel(item.deadline)}</span>
        </div>
        <h3 className="modal-title">{item.title}</h3>
        <p className="modal-org">{item.org} · {item.source} · 마감 {item.deadline}</p>

        <div className={"modal-status status-" + item.status}>{STATUS_LABEL[item.status]}</div>

        {item.failed && item.failed.length > 0 && (
          <ul className="modal-fails">
            {item.failed.map((f) => (
              <li key={f.label}>
                <span className="f-label">{f.label}</span>
                <span className="f-req">요구 {f.req}</span>
                <span className="f-mine">내 조건 {f.mine}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="modal-section">
          <h4>자격요건 원문</h4>
          <p>{item.eligibilityText}</p>
        </div>

        <div className="modal-actions">
          <button className={"modal-star" + (fav ? " on" : "")} onClick={onToggleFav}>
            {fav ? "★ 즐겨찾기 해제" : "☆ 즐겨찾기"}
          </button>
          <a className="apply" href={item.url} target="_blank" rel="noreferrer">원문으로 가서 신청하기 →</a>
        </div>
      </div>
    </div>
  );
}
