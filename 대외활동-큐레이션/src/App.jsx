import { useState, useEffect } from "react";
import { ACTIVITIES } from "./data/activities";
import { splitByMatch } from "./match";
import { daysLeft, isPast } from "./deadline";
import ConditionPanel from "./components/ConditionPanel";
import ResultSection from "./components/ResultSection";
import Card from "./components/Card";
import DetailModal from "./components/DetailModal";
import "./App.css";

const CATEGORIES = ["대외활동", "공모전", "장학", "봉사"];
const DEFAULT_PROFILE = { grade: 3, major: "IT", region: "서울", age: 23, enrollment: "재학", income: null, gpa: null };

export default function App() {
  // 입력 중인 조건(draft). 바꿔도 바로 매칭하지 않는다.
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [showScholarship, setShowScholarship] = useState(false);
  const [query, setQuery] = useState("");

  // "찾기"를 눌렀을 때만 적용되는 조건. 결과는 이걸 기준으로 계산한다.
  const [applied, setApplied] = useState({ profile: DEFAULT_PROFILE, showScholarship: false, query: "" });

  // 결과를 좁히는 가벼운 필터·정렬은 즉시 적용(재매칭 아님).
  const [cats, setCats] = useState(() => new Set(CATEGORIES));
  const [favOnly, setFavOnly] = useState(false);
  const [sortBy, setSortBy] = useState("deadline");
  const [showIneligible, setShowIneligible] = useState(false);
  const [selected, setSelected] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("favorites") || "[]")); } catch { return new Set(); }
  });

  // 즐겨찾기는 로컬스토리지에 저장(로그인 없이 유지).
  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify([...favorites]));
  }, [favorites]);

  const setField = (key, value) => setProfile((p) => ({ ...p, [key]: value }));
  const runSearch = () => setApplied({ profile, showScholarship, query });
  const toggleFav = (id) => setFavorites((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleCat = (c) => setCats((prev) => {
    const next = new Set(prev);
    next.has(c) ? next.delete(c) : next.add(c);
    return next;
  });

  // 적용된 조건으로 매칭. 장학 토글이 꺼져 있으면 소득·학점은 뺀다.
  const ap = applied.profile;
  const matchProfile = {
    ...ap,
    income: applied.showScholarship ? ap.income : null,
    gpa: applied.showScholarship ? ap.gpa : null,
  };

  // 마감 지난 공고 제외 + 검색어(적용된) + 카테고리 + 즐겨찾기만.
  const q = applied.query.trim();
  const live = ACTIVITIES
    .filter((a) => !isPast(a.deadline))
    .filter((a) => q === "" || a.title.includes(q))
    .filter((a) => cats.has(a.category))
    .filter((a) => !favOnly || favorites.has(a.id));

  const { eligible, review, near, ineligible } = splitByMatch(live, matchProfile);

  // 정렬: 마감 임박순 또는 최신 등록순.
  const bySort = sortBy === "recent"
    ? (a, b) => (a.postedAt < b.postedAt ? 1 : a.postedAt > b.postedAt ? -1 : 0)
    : (a, b) => daysLeft(a.deadline) - daysLeft(b.deadline);
  [eligible, review, near, ineligible].forEach((arr) => arr.sort(bySort));

  const total = eligible.length + review.length + near.length + ineligible.length;

  // 상세 모달에 넘길 최신 즐겨찾기 상태(리스트에서 별표 토글해도 반영되게 id로 다시 찾음)
  const selectedFav = selected ? favorites.has(selected.id) : false;

  return (
    <div className="app">
      <header className="header">
        <h1>내 조건에 맞는 대외활동</h1>
        <p>공고를 모아주는 게 아니라, 내가 지원할 수 있는 것만 골라줍니다.</p>
      </header>

      <ConditionPanel
        profile={profile} setField={setField}
        showScholarship={showScholarship} setShowScholarship={setShowScholarship}
        query={query} setQuery={setQuery} runSearch={runSearch}
      />

      <section className="results">
        <div className="filters">
          {CATEGORIES.map((c) => (
            <button key={c} className={"chip" + (cats.has(c) ? " on" : "")} onClick={() => toggleCat(c)}>{c}</button>
          ))}
          <button className={"chip fav-chip" + (favOnly ? " on" : "")} onClick={() => setFavOnly((f) => !f)}>★ 즐겨찾기만</button>
        </div>

        <div className="result-head">
          <div className="summary">
            <span className="s-eligible">가능 {eligible.length}</span>
            <span className="s-review">확인 필요 {review.length}</span>
            <span className="s-near">거의 가능 {near.length}</span>
          </div>
          <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="deadline">마감 임박순</option>
            <option value="recent">최신 등록순</option>
          </select>
        </div>

        <ResultSection title="지원 가능" items={eligible} cls="eligible" favorites={favorites} onToggleFav={toggleFav} onOpen={setSelected} />
        <ResultSection title="확인 필요" items={review} cls="review" favorites={favorites} onToggleFav={toggleFav} onOpen={setSelected} />
        <ResultSection title="거의 가능 (조건 하나만 맞추면)" items={near} cls="near" favorites={favorites} onToggleFav={toggleFav} onOpen={setSelected} />

        {ineligible.length > 0 && (
          <div className="section ineligible">
            <button className="fold" onClick={() => setShowIneligible((s) => !s)}>
              지원 불가 {ineligible.length}건 {showIneligible ? "접기" : "펼치기"}
            </button>
            {showIneligible && (
              <div className="cards">
                {ineligible.map((it) => (
                  <Card key={it.id} item={it} fav={favorites.has(it.id)} onToggleFav={() => toggleFav(it.id)} onOpen={() => setSelected(it)} />
                ))}
              </div>
            )}
          </div>
        )}

        {total === 0 && <p className="empty">조건에 맞는 공고가 없어요. 필터나 검색어를 바꿔보세요.</p>}
      </section>

      <DetailModal
        item={selected} fav={selectedFav}
        onToggleFav={() => selected && toggleFav(selected.id)}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
