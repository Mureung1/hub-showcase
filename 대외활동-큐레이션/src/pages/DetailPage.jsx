import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { matchActivity } from "../match";
import { daysLeft, ddayLabel } from "../deadline";

const STATUS_LABEL = {
  eligible: "지원 가능",
  review: "확인 필요",
  near: "거의 가능 (조건 하나만 맞추면)",
  ineligible: "지원 불가",
};

// 공고 상세 페이지. URL의 :id로 공고를 찾고, 적용된 프로필로 판정해서 보여준다.
export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const c = useOutletContext();

  if (c.loading) {
    return (
      <div className="detail-page">
        <button className="back" onClick={() => navigate(-1)}>← 뒤로</button>
        <p className="empty">불러오는 중…</p>
      </div>
    );
  }

  const activity = c.postings.find((a) => a.id === id);
  if (!activity) {
    return (
      <div className="detail-page">
        <button className="back" onClick={() => navigate(-1)}>← 뒤로</button>
        <p className="empty">공고를 찾을 수 없어요.</p>
      </div>
    );
  }

  const item = { ...activity, ...matchActivity(activity, c.matchProfile) };
  const fav = c.favorites.has(id);
  const urgent = daysLeft(item.deadline) <= 7;

  return (
    <div className="detail-page">
      <button className="back" onClick={() => navigate(-1)}>← 뒤로</button>
      <div className="detail-card">
        <div className="modal-top">
          <span className={"tag tag-" + item.category}>{item.category}</span>
          <span className={"dday" + (urgent ? " urgent" : "")}>{ddayLabel(item.deadline)}</span>
        </div>
        <h2 className="modal-title">{item.title}</h2>
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
          <button className={"modal-star" + (fav ? " on" : "")} onClick={() => c.toggleFav(id)}>
            {fav ? "★ 즐겨찾기 해제" : "☆ 즐겨찾기"}
          </button>
          <a className="apply" href={item.url} target="_blank" rel="noreferrer">원문으로 가서 신청하기 →</a>
        </div>
      </div>
    </div>
  );
}
