import { useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { matchActivity } from "../match";
import { daysLeft, ddayLabel } from "../deadline";
import { MAJORS, REGIONS, ENROLLMENTS } from "../data/activities";
import Field from "../components/Field";

const STATUS_LABEL = {
  eligible: "지원 가능",
  review: "확인 필요",
  near: "거의 가능 (조건 하나만 맞추면)",
  ineligible: "지원 불가",
};

const GRADES = [1, 2, 3, 4];
const INCOMES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 막힌 조건 하나를 그 자리에서 고치는 컨트롤. 라벨(match.js)과 프로필 키를 1:1로 잇는다.
function FailEdit({ label, profile, onEdit }) {
  if (label === "학년") return <Field label="이 조건 바꾸기" value={profile.grade} onChange={(v) => onEdit("grade", v)} options={GRADES} parse={Number} format={(v) => v + "학년"} />;
  if (label === "전공") return <Field label="이 조건 바꾸기" value={profile.major} onChange={(v) => onEdit("major", v)} options={MAJORS} />;
  if (label === "지역") return <Field label="이 조건 바꾸기" value={profile.region} onChange={(v) => onEdit("region", v)} options={REGIONS} />;
  if (label === "재학상태") return <Field label="이 조건 바꾸기" value={profile.enrollment} onChange={(v) => onEdit("enrollment", v)} options={ENROLLMENTS} />;
  if (label === "소득분위") return <Field label="이 조건 바꾸기" value={profile.income} onChange={(v) => onEdit("income", v)} options={INCOMES} parse={Number} format={(v) => v + "분위"} />;
  if (label === "나이") return (
    <label className="field"><span className="field-label">이 조건 바꾸기</span>
      <input type="number" min="15" max="99" value={profile.age ?? ""} onChange={(e) => onEdit("age", e.target.value === "" ? null : Number(e.target.value))} />
    </label>
  );
  if (label === "학점") return (
    <label className="field"><span className="field-label">이 조건 바꾸기</span>
      <input type="range" min="2" max="4.5" step="0.1" value={profile.gpa ?? 3.5} onChange={(e) => onEdit("gpa", Number(e.target.value))} />
    </label>
  );
  return null;
}

// 공고 상세 페이지. URL의 :id로 공고를 찾고, 적용된 프로필로 판정해서 보여준다.
export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const c = useOutletContext();
  const [edited, setEdited] = useState(false);
  const onEdit = (key, value) => { c.applyField(key, value); setEdited(true); };

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
        <p className="modal-org">{[item.org, item.source, `마감 ${item.deadline}`].filter(Boolean).join(" · ")}</p>

        <div className={"modal-status status-" + item.status}>{STATUS_LABEL[item.status]}</div>

        {edited && item.status === "eligible" && (
          <p className="fixed-msg">조건을 맞췄어요 — 지원 가능!</p>
        )}

        {item.failed && item.failed.length > 0 && (
          <ul className="modal-fails">
            {item.failed.map((f) => (
              <li key={f.label}>
                <div className="f-info">
                  <span className="f-label">{f.label}</span>
                  <span className="f-req">요구 {f.req}</span>
                  <span className="f-mine">내 조건 {f.mine}</span>
                </div>
                <FailEdit label={f.label} profile={c.profile} onEdit={onEdit} />
              </li>
            ))}
          </ul>
        )}

        {item.eligibilityText && (
          <div className="modal-section">
            <h4>자격요건 원문</h4>
            <p>{item.eligibilityText}</p>
          </div>
        )}

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
