import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { interestOptionsByCategory } from "../data/mockListings";
import BookmarkStar from "../components/BookmarkStar";

const GRADE_GUIDE_CATEGORIES = ["activity", "internship"];
const TEAM_RECRUIT_INTEREST = "팀원모집";

export default function CategoryList() {
  const { categoryId } = useParams();
  const {
    regionLabel,
    gradeLabel,
    region,
    grade,
    bookmarks,
    toggleBookmark,
    categories,
    listings,
    boardPosts,
  } = useOutletContext();
  const [interest, setInterest] = useState("all");

  useEffect(() => {
    setInterest("all");
  }, [categoryId]);

  const category = categories.find((c) => c.id === categoryId);
  const interestOptions = interestOptionsByCategory[categoryId];
  const showGradeGuide = GRADE_GUIDE_CATEGORIES.includes(categoryId) && grade !== "all";
const totalCount = listings.filter((l) => l.categoryId === categoryId).length;
  const categoryListings = listings
    .filter((l) => l.categoryId === categoryId)
    .filter((l) => region === "all" || !l.eligibleRegions || l.eligibleRegions.includes(region))
    .filter((l) => grade === "all" || !l.eligibleGrades || l.eligibleGrades.includes(grade))
    .filter((l) => {
      if (interest === "all") return true;
      if (interest === TEAM_RECRUIT_INTEREST) return boardPosts.some((p) => p.listingId === l.id);
      return l.interest === interest;
    })
    .sort((a, b) => {
      const aMatch = region !== "all" && a.eligibleRegions?.includes(region) ? 0 : 1;
      const bMatch = region !== "all" && b.eligibleRegions?.includes(region) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.dDay - b.dDay;
    });

  return (
    <div className="cat-layout shell">
      <aside className="cat-aside">
        <p className="aside-label">카테고리</p>
        {categories.map((c) => (
          <Link key={c.id} to={`/category/${c.id}`} className={c.id === categoryId ? "active" : undefined}>
            {c.label}
          </Link>
        ))}
        <Link to="/board">팀원모집</Link>
      </aside>
      <div>
        <p className="crumb">
          <Link to="/">홈</Link> / {category.label}
        </p>
        <div className="cat-head">
          <h1>{category.label}</h1>
          <p className="cat-sub">전체 {totalCount}개 중 내 조건에 맞는 {categoryListings.length}개</p>
      
          <span className="filter-pill">
            {regionLabel} · {gradeLabel}
          </span>
        </div>
        <p className="cat-sub">{category.desc}</p>

        {interestOptions && (
          <div style={{ marginBottom: 24 }}>
            <p className="filter-label">관심분야</p>
            <div className="chip-row">
              <button
                className={`chip sm ${interest === "all" ? "active" : ""}`}
                onClick={() => setInterest("all")}
              >
                전체
              </button>
              {interestOptions.map((opt) => (
                <button
                  key={opt}
                  className={`chip sm ${interest === opt ? "active" : ""}`}
                  onClick={() => setInterest(opt)}
                >
                  {opt}
                </button>
              ))}
              {categoryId === "activity" && (
                <button
                  className={`chip sm ${interest === TEAM_RECRUIT_INTEREST ? "active" : ""}`}
                  onClick={() => setInterest(TEAM_RECRUIT_INTEREST)}
                >
                  {TEAM_RECRUIT_INTEREST}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="divider-list">
          {categoryListings.map((l) => (
            <Link className="row" to={`/listing/${l.id}`} key={l.id}>
              <div className="main">
                <div className="top-line">
                  <span className="title">{l.title}</span>
                  {l.teamBoardCount > 0 && (
                    <span className="pill-team">팀원모집 {l.teamBoardCount}건</span>
                  )}
                  {showGradeGuide && l.eligibleGrades?.includes(grade) && (
                    <span className="pill-grade">{gradeLabel} 추천</span>
                  )}
                  {region !== "all" && l.eligibleRegions?.includes(region) && (
  <span className="pill-grade">{regionLabel} 추천</span>
)}
                </div>
                <div className="desc">{l.desc}</div>
              </div>
              <span className={l.dDay <= 7 ? "pill-alert" : "pill-neutral"}>D-{l.dDay}</span>
              <BookmarkStar
                active={bookmarks.includes(l.id)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleBookmark(l.id);
                }}
              />
            </Link>
          ))}
          {categoryListings.length === 0 && (
            <p className="cat-sub">선택한 조건에 맞는 공고가 없어요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
