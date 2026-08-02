import { useEffect, useMemo, useState } from "react";
import { getGroupBuys } from "../services/groupBuysApi";
import { getSavedStorageKey } from "../services/groupBuyFilters";

function ids(key) { try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; } }

function ActivityPage({ onNavigate, user }) {
  const [items, setItems] = useState([]);
  const joined = useMemo(() => ids("campus-cart-joined"), []);
  const saved = useMemo(() => ids(getSavedStorageKey(user?.id)), [user?.id]);
  useEffect(() => { getGroupBuys().then(setItems).catch(() => setItems([])); }, []);
  const joinedItems = items.filter((item) => joined.includes(item.id));
  const savedItems = items.filter((item) => saved.includes(item.id));
  return <main className="workspace activity-page"><section className="activity-hero"><div><span className="kicker">MY CAMPUS CART</span><h1>내 공동구매를<br />한눈에 확인해요.</h1><p>참여한 모집과 찜한 상품을 모아보고 다음 수령 일정을 준비하세요.</p></div><div className="activity-stats"><div><strong>{joinedItems.length}</strong><span>참여 중</span></div><div><strong>{savedItems.length}</strong><span>찜한 모집</span></div><div><strong>{joinedItems.filter((item) => item.status === "closed").length}</strong><span>모집 완료</span></div></div></section><ActivityList title="참여한 공동구매" empty="아직 참여한 공동구매가 없어요." items={joinedItems} onNavigate={onNavigate} /><ActivityList title="찜한 공동구매" empty="마음에 드는 모집을 찜해보세요." items={savedItems} onNavigate={onNavigate} /></main>;
}

function ActivityList({ empty, items, onNavigate, title }) { return <section className="activity-block"><div className="home-title"><h2>{title}</h2><button type="button" onClick={() => onNavigate("/group-buys")}>모집 둘러보기 →</button></div>{items.length === 0 ? <div className="activity-empty"><span>◎</span><strong>{empty}</strong><button type="button" onClick={() => onNavigate("/group-buys")}>공동구매 찾아보기</button></div> : <div className="activity-list">{items.map((item) => <article key={item.id}><span className={`state-chip ${item.status}`}>{item.status === "open" ? "모집 중" : "완료"}</span><div><h3>{item.name}</h3><p>{item.pickupLocation} · {item.deadline}</p></div><strong>{item.currentPeople}/{item.targetPeople}명</strong></article>)}</div>}</section>; }

export default ActivityPage;
