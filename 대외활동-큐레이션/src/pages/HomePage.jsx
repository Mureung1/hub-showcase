import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { splitByMatch } from "../match";
import { daysLeft, isPast } from "../deadline";
import { CATEGORIES } from "../constants";
import ConditionPanel from "../components/ConditionPanel";
import ResultSection from "../components/ResultSection";
import Card from "../components/Card";
import Hero from "../components/Hero";

// 홈 화면. App이 가진 state를 Outlet context(props)로 받아서 조건 입력 + 결과를 보여준다.
export default function HomePage() {
  const c = useOutletContext();
  const navigate = useNavigate();
  const [showIneligible, setShowIneligible] = useState(false);

  // 적용된 검색어 + 카테고리 + 즐겨찾기만 필터. 마감 지난 건 제외. 데이터는 App이 불러온 c.postings.
  const q = c.applied.query.trim();
  const live = c.postings
    .filter((a) => !isPast(a.deadline))
    .filter((a) => q === "" || a.title.includes(q))
    .filter((a) => c.cats.has(a.category))
    .filter((a) => !c.favOnly || c.favorites.has(a.id));

  const { eligible, review, near, ineligible } = splitByMatch(live, c.matchProfile);
  const bySort = c.sortBy === "recent"
    ? (a, b) => (a.postedAt < b.postedAt ? 1 : a.postedAt > b.postedAt ? -1 : 0)
    : (a, b) => daysLeft(a.deadline) - daysLeft(b.deadline);
  [eligible, review, near, ineligible].forEach((arr) => arr.sort(bySort));
  const total = eligible.length + review.length + near.length + ineligible.length;

  const openDetail = (item) => navigate(`/activity/${item.id}`);

  // 히어로용: 마감 안 지난 전체 공고 수(규모)와 마지막 수집 시각(신선도). 필터와 무관하게 전체 기준.
  const liveCount = c.postings.filter((a) => !isPast(a.deadline)).length;
  const lastCollected = c.postings.reduce((max, a) => (a.collectedAt > max ? a.collectedAt : max), "");

  return (
    <>
      <Hero count={liveCount} updatedAt={lastCollected} />
      <ConditionPanel
        profile={c.profile} setField={c.setField}
        showScholarship={c.showScholarship} setShowScholarship={c.setShowScholarship}
        query={c.query} setQuery={c.setQuery} runSearch={c.runSearch}
      />

      {c.loading ? (
        <p className="empty">공고를 불러오는 중…</p>
      ) : c.loadError ? (
        <p className="empty">공고를 불러오지 못했어요: {c.loadError.message}</p>
      ) : (
        <section className="results">
          <div className="filters">
            {CATEGORIES.map((cat) => (
              <button key={cat} className={"chip" + (c.cats.has(cat) ? " on" : "")} onClick={() => c.toggleCat(cat)}>{cat}</button>
            ))}
            <button className={"chip fav-chip" + (c.favOnly ? " on" : "")} onClick={() => c.setFavOnly((f) => !f)}>★ 즐겨찾기만</button>
          </div>

          <div className="result-head">
            <div className="summary">
              <span className="s-eligible">가능 {eligible.length}</span>
              <span className="s-review">확인 필요 {review.length}</span>
              {near.length > 0 && <span className="s-near">거의 가능 {near.length}</span>}
            </div>
            <select className="sort-select" value={c.sortBy} onChange={(e) => c.setSortBy(e.target.value)}>
              <option value="deadline">마감 임박순</option>
              <option value="recent">최신 등록순</option>
            </select>
          </div>

          <ResultSection title="지원 가능" items={eligible} cls="eligible" favorites={c.favorites} onToggleFav={c.toggleFav} onOpen={openDetail} />
          <ResultSection title="확인 필요" items={review} cls="review" favorites={c.favorites} onToggleFav={c.toggleFav} onOpen={openDetail} />
          <ResultSection title="거의 가능 (조건 하나만 맞추면)" items={near} cls="near" favorites={c.favorites} onToggleFav={c.toggleFav} onOpen={openDetail} />

          {ineligible.length > 0 && (
            <div className="section ineligible">
              <button className="fold" onClick={() => setShowIneligible((s) => !s)}>
                지원 불가 {ineligible.length}건 {showIneligible ? "접기" : "펼치기"}
              </button>
              {showIneligible && (
                <div className="cards">
                  {ineligible.map((it) => (
                    <Card key={it.id} item={it} fav={c.favorites.has(it.id)} onToggleFav={() => c.toggleFav(it.id)} onOpen={() => openDetail(it)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {total === 0 && <p className="empty">조건에 맞는 공고가 없어요. 필터나 검색어를 바꿔보세요.</p>}
        </section>
      )}
    </>
  );
}
