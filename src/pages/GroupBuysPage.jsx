import { useCallback, useEffect, useMemo, useState } from "react";
import GroupBuyEditor from "../components/GroupBuyEditor";
import ProductImage from "../components/ProductImage";
import { deleteGroupBuy, getGroupBuys, updateGroupBuy } from "../services/groupBuysApi";
import { getSavedStorageKey, matchesGroupBuyCategory, matchesGroupBuyFilter, reconcileSavedIds } from "../services/groupBuyFilters";
import { getGroupBuySearchResults } from "../services/groupBuyRecommendations";

const filters = [["all", "전체"], ["open", "모집 중"], ["mine", "내 참여"], ["saved", "찜"]];
const categories = [["all", "전체"], ["생활", "생활"], ["식품", "식품"], ["간식", "간식"], ["문구", "문구"], ["기타", "기타"]];

function storedIds(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
}

function sortItems(items, sort) {
  return [...items].sort((a, b) => sort === "popular"
    ? (b.currentPeople / b.targetPeople) - (a.currentPeople / a.targetPeople)
    : new Date(b.createdAt) - new Date(a.createdAt));
}

function GroupBuysPage({ onNavigate, user }) {
  const savedStorageKey = getSavedStorageKey(user?.id);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("recent");
  const [editingItem, setEditingItem] = useState(null);
  const [savedIds, setSavedIds] = useState(() => storedIds(savedStorageKey));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const applyItems = useCallback((nextItems) => {
    setItems(nextItems);
    const storedSavedIds = storedIds(savedStorageKey);
    const reconciledIds = reconcileSavedIds(storedSavedIds, nextItems);
    setSavedIds(reconciledIds);
    if (reconciledIds.length !== storedSavedIds.length) {
      localStorage.setItem(savedStorageKey, JSON.stringify(reconciledIds));
    }
  }, [savedStorageKey]);

  async function load() {
    setIsLoading(true);
    try { applyItems(await getGroupBuys()); setError(""); }
    catch (requestError) { setError(requestError.message); }
    finally { setIsLoading(false); }
  }

  useEffect(() => {
    getGroupBuys()
      .then(applyItems)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, [applyItems]);

  const metrics = useMemo(() => ({
    open: items.filter((item) => item.status === "open").length,
    people: items.reduce((sum, item) => sum + item.currentPeople, 0),
    almost: items.filter((item) => item.status === "open" && item.currentPeople / item.targetPeople >= .7).length,
  }), [items]);

  const search = useMemo(() => getGroupBuySearchResults(items, query), [items, query]);
  const baseItems = query.trim() ? search.exact : items;
  const visibleItems = useMemo(() => sortItems(
    baseItems.filter((item) => matchesGroupBuyFilter(item, filter, savedIds) && matchesGroupBuyCategory(item, category)),
    sort,
  ), [baseItems, category, filter, savedIds, sort]);

  function startNewGroupBuy() {
    sessionStorage.setItem("campus-cart-draft-name", query.trim());
    onNavigate("/group-buys/new");
  }

  async function save(input) {
    if (!user) { onNavigate("/login"); return; }
    setIsSaving(true);
    try {
      await updateGroupBuy(editingItem.id, input);
      setEditingItem(null);
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setIsSaving(false); }
  }

  function toggleSaved(item) {
    const next = savedIds.includes(item.id) ? savedIds.filter((id) => id !== item.id) : [...savedIds, item.id];
    setSavedIds(next);
    localStorage.setItem(savedStorageKey, JSON.stringify(next));
  }

  async function remove(item) {
    if (!window.confirm(`'${item.name}' 공동구매를 삭제할까요?`)) return;
    try { await deleteGroupBuy(item.id); await load(); }
    catch (requestError) { setError(requestError.message); }
  }

  return (
    <main className="workspace">
      <section className="home-hero">
        <div className="hero-copy"><span className="kicker">CAMPUS GROUP BUY</span><h1>같이 사면,<br /><em>생활이 가벼워져요.</em></h1><p>우리 학교에서 필요한 물건을 함께 사고, 모두에게 가까운 곳에서 편하게 받아보세요.</p><button className="hero-button" type="button" onClick={() => document.getElementById("product-search")?.focus()}>상품 검색하기 <span>→</span></button></div>
        <div className="hero-board"><span className="board-label">오늘의 캠퍼스</span><div className="metric-main"><strong>{metrics.open}</strong><span>지금 모집 중</span></div><div className="metric-pair"><div><strong>{metrics.people}</strong><span>함께하는 사람</span></div><div><strong>{metrics.almost}</strong><span>마감 임박</span></div></div><p>필요한 물건이 없다면 직접 모집을 시작해 보세요.</p></div>
      </section>

      {error && <div className="error-banner"><span>목록을 불러오지 못했어요.</span><button type="button" onClick={load}>다시 시도</button></div>}

      <section className="group-buy-search-section">
        <span className="kicker">FIND A PRODUCT</span>
        <h2>무엇을 함께 사고 싶나요?</h2>
        <div className="large-search">
          <span aria-hidden="true">⌕</span>
          <input id="product-search" value={query} onChange={(event) => { setQuery(event.target.value); setFilter("all"); }} placeholder="상품명을 크게 검색해 보세요. 예: 단백질 쉐이크" />
          {query && <button aria-label="검색어 지우기" type="button" onClick={() => setQuery("")}>×</button>}
        </div>
        <p>이미 모집 중인 비슷한 상품을 먼저 추천해 드려요.</p>
      </section>

      {query.trim() && (
        <section className="recommendation-section">
          <div className="list-heading"><div><span className="kicker">SMART MATCH</span><strong>비슷한 공동구매 추천</strong></div><span>{search.recommendations.length}개</span></div>
          {search.recommendations.length > 0
            ? <div className="recommendation-grid">{search.recommendations.map((item) => <RecommendationCard item={item} key={item.id} onNavigate={onNavigate} />)}</div>
            : <p className="no-recommendation">아직 비슷한 모집이 없어요. 아래에서 새 공동구매를 만들 수 있어요.</p>}
        </section>
      )}

      <section className="section-intro"><div><span className="kicker">DISCOVER</span><h2>{query.trim() ? `'${query.trim()}' 검색 결과` : "지금 함께 사고 있어요"}</h2></div></section>
      <div className={`workspace-grid${editingItem ? "" : " single"}`}>
        <section className="list-panel">
          <div className="toolbar"><div className="filter-tabs wide">{filters.map(([value, label]) => <button className={filter === value ? "active" : ""} type="button" key={value} onClick={() => setFilter(value)}>{label}{value === "saved" && savedIds.length > 0 ? ` ${savedIds.length}` : ""}</button>)}</div><select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="정렬"><option value="recent">새로 등록한 순</option><option value="popular">달성률 높은 순</option></select></div>
          <div className="category-filter" aria-label="카테고리 필터">{categories.map(([value, label]) => <button className={category === value ? "active" : ""} type="button" key={value} onClick={() => setCategory(value)}>{label}<span>{value === "all" ? items.length : items.filter((item) => item.category === value).length}</span></button>)}</div>
          <div className="list-heading"><strong>공동구매 목록</strong><span>{visibleItems.length}개</span></div>
          {isLoading ? <div className="empty-panel">공동구매를 불러오는 중...</div> : visibleItems.length === 0 ? <div className="empty-panel"><strong>{error ? "목록을 확인한 뒤 다시 검색해 주세요." : query.trim() ? `'${query.trim()}' 공동구매가 없어요.` : "현재 조건에 맞는 공동구매가 없어요."}</strong><span>{query.trim() ? "추천받을 모집이 없다면 직접 새 글을 만들어 보세요." : "검색어나 필터를 바꿔보세요."}</span></div> : <div className="group-list">{visibleItems.map((item) => <GroupBuyRow item={item} key={item.id} onDelete={remove} onEdit={setEditingItem} onNavigate={onNavigate} onSave={toggleSaved} saved={savedIds.includes(item.id)} />)}</div>}
          {!error && <div className="create-cta"><div><strong>{query.trim() ? "원하는 모집이 없나요?" : "찾는 상품이 아직 없나요?"}</strong><span>상품 링크를 붙여 넣으면 새 글을 더 빠르게 작성할 수 있어요.</span></div><button className="primary-button" type="button" onClick={startNewGroupBuy}>새 공동구매 만들기</button></div>}
        </section>
        {editingItem && <div id="edit-group-buy"><GroupBuyEditor editingItem={editingItem} isSaving={isSaving} key={editingItem.id} onCancel={() => setEditingItem(null)} onSave={save} /></div>}
      </div>
    </main>
  );
}

function RecommendationCard({ item, onNavigate }) {
  const percent = Math.min(100, Math.round((item.currentPeople / item.targetPeople) * 100));
  return <button className="recommendation-card" type="button" onClick={() => onNavigate(`/group-buys/${item.id}`)}><ProductImage category={item.category} imageUrl={item.imageUrl} name={item.name} /><div><span>{item.category} · {percent}% 달성</span><strong>{item.name}</strong><small>{item.currentPeople}/{item.targetPeople}명 참여 중</small></div><b>참여하기 →</b></button>;
}

function GroupBuyRow({ item, onDelete, onEdit, onNavigate, onSave, saved }) {
  const percent = Math.min(100, Math.round((item.currentPeople / item.targetPeople) * 100));
  return <article className={`group-row ${item.isOwner ? "owned" : ""}`}><ProductImage category={item.category} className="row-product-image" imageUrl={item.imageUrl} name={item.name} /><div className="group-row-content"><div className="row-top"><span className={`state-chip ${item.status}`}>{item.status === "open" ? "모집 중" : "마감"}</span><span>{item.category}</span><span className="host-label">{item.isOwner ? "내가 개설" : item.hostName}</span><button className={`save-button ${saved ? "saved" : ""}`} type="button" aria-label={saved ? "찜 해제" : "찜하기"} onClick={() => onSave(item)}>{saved ? "♥" : "♡"}</button></div><h2>{item.name}</h2><p>{item.pickupLocation} · {item.deadline}</p><div className="progress-line"><span style={{ width: `${percent}%` }} /></div><div className="progress-copy"><strong>{item.currentPeople}/{item.targetPeople}명</strong><span>{percent}% 달성</span></div><div className="row-actions"><button type="button" onClick={() => onNavigate(`/group-buys/${item.id}`)}>상세 보기</button>{item.isOwner && <><button type="button" onClick={() => onEdit(item)}>모집 수정</button><button className="danger" type="button" onClick={() => onDelete(item)}>모집 삭제</button></>}</div></div></article>;
}

export default GroupBuysPage;
