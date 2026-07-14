import { daysLeft, ddayLabel } from "../deadline";

// 카드 하단에 보여줄 한 줄(상태별로 다르게)
function reasonText(item) {
  if (item.status === "review") return `확인 필요 — ${item.eligibilityText}`;
  if (item.status === "near") {
    const f = item.failed[0];
    return `이것만 맞으면 가능: ${f.label} ${f.req} (내 조건 ${f.mine})`;
  }
  if (item.status === "ineligible") {
    return "안 맞는 조건 — " + item.failed.map((f) => `${f.label} ${f.req}`).join(", ");
  }
  return item.eligibilityText;
}

export default function Card({ item, fav, onToggleFav, onOpen }) {
  const urgent = daysLeft(item.deadline) <= 7;
  return (
    <article className="card" onClick={onOpen}>
      <div className="card-top">
        <span className={"tag tag-" + item.category}>{item.category}</span>
        <div className="card-top-right">
          <span className={"dday" + (urgent ? " urgent" : "")}>{ddayLabel(item.deadline)}</span>
          <button className={"star" + (fav ? " on" : "")} onClick={(e) => { e.stopPropagation(); onToggleFav(); }} title="즐겨찾기" aria-label="즐겨찾기">
            {fav ? "★" : "☆"}
          </button>
        </div>
      </div>
      <h4 className="card-title">{item.title}</h4>
      <p className="card-org">{item.org} · {item.source}</p>
      <p className="card-reason">{reasonText(item)}</p>
      <a className="apply" href={item.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>원문으로 가서 신청하기 →</a>
    </article>
  );
}
