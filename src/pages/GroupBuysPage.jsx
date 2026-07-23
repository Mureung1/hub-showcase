import { useEffect, useMemo, useState } from "react";
import GroupBuyEditor from "../components/GroupBuyEditor";
import { createGroupBuy, deleteGroupBuy, getGroupBuys, updateGroupBuy } from "../services/groupBuysApi";
import { matchesGroupBuyFilter } from "../services/groupBuyFilters";

const filters = [["all", "전체"], ["open", "모집 중"], ["mine", "내 참여"], ["saved", "찜"]];

function storedIds(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
}

function GroupBuysPage({ onNavigate, user }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [editingItem, setEditingItem] = useState(null);
  const [savedIds, setSavedIds] = useState(() => storedIds("campus-cart-saved"));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [error, setError] = useState("");
  const suggestedPickup = sessionStorage.getItem("campus-cart-pickup") ?? "";

  async function load() {
    setIsLoading(true);
    try { setItems(await getGroupBuys()); setError(""); }
    catch (requestError) { setError(requestError.message); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { getGroupBuys().then(setItems).catch((requestError) => setError(requestError.message)).finally(() => setIsLoading(false)); }, []);

  const metrics = useMemo(() => ({
    open: items.filter((item) => item.status === "open").length,
    people: items.reduce((sum, item) => sum + item.currentPeople, 0),
    almost: items.filter((item) => item.status === "open" && item.currentPeople / item.targetPeople >= .7).length,
  }), [items]);

  const visibleItems = useMemo(() => items
    .filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((item) => matchesGroupBuyFilter(item, filter, savedIds))
    .sort((a, b) => sort === "popular" ? (b.currentPeople / b.targetPeople) - (a.currentPeople / a.targetPeople) : new Date(b.createdAt) - new Date(a.createdAt)),
  [filter, items, query, savedIds, sort]);

  async function save(input) {
    if (!user) { onNavigate("/login"); return; }
    setIsSaving(true);
    try {
      if (editingItem) await updateGroupBuy(editingItem.id, input); else await createGroupBuy(input);
      setEditingItem(null); setFormVersion((version) => version + 1); sessionStorage.removeItem("campus-cart-pickup"); await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setIsSaving(false); }
  }

  function toggleSaved(item) {
    const next = savedIds.includes(item.id) ? savedIds.filter((id) => id !== item.id) : [...savedIds, item.id];
    setSavedIds(next); localStorage.setItem("campus-cart-saved", JSON.stringify(next));
  }

  async function remove(item) {
    if (!window.confirm(`'${item.name}' 공동구매를 삭제할까요?`)) return;
    try { await deleteGroupBuy(item.id); await load(); }
    catch (requestError) { setError(requestError.message); }
  }

  return (
    <main className="workspace">
      <section className="home-hero">
        <div className="hero-copy"><span className="kicker">CAMPUS GROUP BUY</span><h1>같이 사면,<br /><em>생활이 가벼워져요.</em></h1><p>우리 학교에서 필요한 물건을 함께 사고, 가까운 곳에서 편하게 받아보세요.</p><button className="hero-button" type="button" onClick={() => document.getElementById("new-group-buy")?.scrollIntoView({ behavior: "smooth" })}>공동구매 열기 <span>↗</span></button></div>
        <div className="hero-board"><span className="board-label">오늘의 캠퍼스</span><div className="metric-main"><strong>{metrics.open}</strong><span>지금 모집 중</span></div><div className="metric-pair"><div><strong>{metrics.people}</strong><span>함께하는 사람</span></div><div><strong>{metrics.almost}</strong><span>마감 임박</span></div></div><p>필요한 물건이 없다면 직접 모집을 시작해 보세요.</p></div>
      </section>
      {error && <div className="error-banner"><span>목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</span><button type="button" onClick={load}>다시 시도</button></div>}
      <section className="section-intro"><div><span className="kicker">DISCOVER</span><h2>지금 같이 살 수 있어요</h2></div><button type="button" onClick={() => onNavigate("/pickup")}>수령 장소 둘러보기 →</button></section>
      <div className="workspace-grid">
        <section className="list-panel">
          <div className="toolbar"><label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명 검색" /></label><select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="정렬"><option value="recent">새로 등록된 순</option><option value="popular">달성률 높은 순</option></select></div>
          <div className="filter-tabs wide">{filters.map(([value, label]) => <button className={filter === value ? "active" : ""} type="button" key={value} onClick={() => setFilter(value)}>{label}{value === "saved" && savedIds.length > 0 ? ` ${savedIds.length}` : ""}</button>)}</div>
          <div className="list-heading"><strong>공동구매 목록</strong><span>{visibleItems.length}개</span></div>
          {isLoading ? <div className="empty-panel">공동구매를 불러오는 중…</div> : visibleItems.length === 0 ? <div className="empty-panel"><strong>아직 해당하는 공동구매가 없어요</strong><span>새 모집을 직접 열어보세요.</span></div> : <div className="group-list">{visibleItems.map((item) => <GroupBuyRow item={item} key={item.id} onDelete={remove} onEdit={setEditingItem} onNavigate={onNavigate} onSave={toggleSaved} saved={savedIds.includes(item.id)} />)}</div>}
        </section>
        <div id="new-group-buy"><GroupBuyEditor editingItem={editingItem} formVersion={formVersion} isSaving={isSaving} onCancel={() => setEditingItem(null)} onSave={save} suggestedPickup={suggestedPickup} /></div>
      </div>
    </main>
  );
}

function GroupBuyRow({ item, onDelete, onEdit, onNavigate, onSave, saved }) {
  const percent = Math.min(100, Math.round((item.currentPeople / item.targetPeople) * 100));
  return <article className={`group-row ${item.isOwner ? "owned" : ""}`}><div className="row-top"><span className={`state-chip ${item.status}`}>{item.status === "open" ? "모집 중" : "마감"}</span><span>{item.category}</span><span className="host-label">{item.isOwner ? "내가 개설" : item.hostName}</span><button className={`save-button ${saved ? "saved" : ""}`} type="button" aria-label={saved ? "찜 해제" : "찜하기"} onClick={() => onSave(item)}>{saved ? "♥" : "♡"}</button></div><h2>{item.name}</h2><p>{item.pickupLocation} · {item.deadline}</p><div className="progress-line"><span style={{ width: `${percent}%` }} /></div><div className="progress-copy"><strong>{item.currentPeople}/{item.targetPeople}명</strong><span>{percent}% 달성</span></div><div className="row-actions"><button type="button" onClick={() => onNavigate(`/group-buys/${item.id}`)}>상세 보기</button>{item.isOwner ? <><button type="button" onClick={() => onEdit(item)}>모집 수정</button><button className="danger" type="button" onClick={() => onDelete(item)}>모집 삭제</button></> : <button type="button" onClick={() => onNavigate("/pickup")}>중간 장소 찾기</button>}</div></article>;
}

export default GroupBuysPage;
