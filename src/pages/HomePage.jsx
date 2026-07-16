import { useEffect, useMemo, useState } from "react";
import { getGroupBuys } from "../services/groupBuysApi";

const categories = [["생활", "🧺", "생활용품"], ["식품", "🥬", "식품"], ["간식", "🍪", "간식"], ["문구", "✏️", "문구"], ["기타", "📦", "전체보기"]];

function HomePage({ onNavigate }) {
  const [items, setItems] = useState([]);
  useEffect(() => { getGroupBuys().then(setItems).catch(() => setItems([])); }, []);
  const popular = useMemo(() => [...items].sort((a, b) => (b.currentPeople / b.targetPeople) - (a.currentPeople / a.targetPeople)).slice(0, 3), [items]);
  const people = items.reduce((sum, item) => sum + item.currentPeople, 0);

  return <main className="home-page"><section className="landing-hero"><div className="landing-copy"><span className="eyebrow">BUY LESS, SHARE MORE</span><h1>혼자 사기엔 많고,<br /><em>같이 사면 딱 좋아요.</em></h1><p>캠퍼스 이웃과 필요한 만큼 나누고, 가까운 장소에서 가볍게 만나세요.</p><div className="hero-actions"><button className="hero-button" type="button" onClick={() => onNavigate("/group-buys")}>공동구매 둘러보기 <span>→</span></button><button className="ghost-button" type="button" onClick={() => onNavigate("/pickup")}>수령 장소 찾기</button></div><div className="trust-row"><span>✓ 학교 안심 거래</span><span>✓ 가까운 수령</span><span>✓ 필요한 만큼만</span></div></div><div className="landing-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="floating-card card-a"><small>마감 임박</small><strong>{popular[0]?.name ?? "오늘의 공동구매"}</strong><span>{popular[0] ? `${popular[0].currentPeople}/${popular[0].targetPeople}명 참여` : "새 모집을 기다리고 있어요"}</span></div><div className="floating-card card-b"><span>함께 절약하는 캠퍼스</span><strong>{people}명</strong><small>현재 참여 인원</small></div><div className="hero-symbol">C</div></div></section>
  <section className="home-section"><div className="home-title"><div><span className="kicker">CATEGORY</span><h2>무엇을 같이 살까요?</h2></div><p>자주 필요한 물건부터 가볍게 찾아보세요.</p></div><div className="category-grid">{categories.map(([value, icon, label]) => <button type="button" key={value} onClick={() => onNavigate("/group-buys")}><span>{icon}</span><strong>{label}</strong><small>둘러보기 →</small></button>)}</div></section>
  <section className="home-section popular-section"><div className="home-title"><div><span className="kicker">TRENDING NOW</span><h2>지금 인기 있는 공동구매</h2></div><button type="button" onClick={() => onNavigate("/group-buys")}>전체 보기 →</button></div><div className="popular-grid">{popular.map((item, index) => <article key={item.id}><div className="popular-meta"><span>0{index + 1}</span><b>{item.category}</b></div><h3>{item.name}</h3><p>{item.pickupLocation} · {item.deadline}</p><div className="progress-line"><span style={{ width: `${Math.min(100, item.currentPeople / item.targetPeople * 100)}%` }} /></div><footer><strong>{item.currentPeople}/{item.targetPeople}명</strong><button type="button" onClick={() => onNavigate(`/group-buys/${item.id}`)}>상세 보기</button></footer></article>)}</div></section>
  <section className="how-section"><div><span className="kicker">HOW IT WORKS</span><h2>세 단계면 충분해요</h2></div>{[["01", "찾기", "필요한 공동구매를 둘러봐요."], ["02", "참여하기", "인원과 수령 장소를 확인해요."], ["03", "함께 받기", "약속한 장소에서 나눠 받아요."]].map(([num, title, copy]) => <article key={num}><span>{num}</span><strong>{title}</strong><p>{copy}</p></article>)}</section></main>;
}

export default HomePage;
