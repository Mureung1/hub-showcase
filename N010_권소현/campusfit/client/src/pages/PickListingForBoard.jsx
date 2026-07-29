import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { formatDDay } from "../utils/dday";

export default function PickListingForBoard() {
  const { listings, region, regionLabel, bookmarks } = useOutletContext();
  const [search, setSearch] = useState("");

  const activityListings = listings
    .filter((l) => l.categoryId === "activity")
    .filter((l) => region === "all" || !l.eligibleRegions || l.eligibleRegions.includes(region))
    .filter((l) => {
      const keyword = search.trim();
      if (!keyword) return true;
      return `${l.title} ${l.desc}`.includes(keyword);
    })
    .sort((a, b) => {
      const aBookmarked = bookmarks.includes(a.id) ? 0 : 1;
      const bBookmarked = bookmarks.includes(b.id) ? 0 : 1;
      if (aBookmarked !== bBookmarked) return aBookmarked - bBookmarked;
      return a.dDay - b.dDay;
    });

  return (
    <div className="detail">
      <p className="crumb">
        <Link to="/board">홈 / 팀원모집</Link>
      </p>
      <h1 style={{ fontWeight: 800, fontSize: 32, letterSpacing: "-.02em", margin: "0 0 8px" }}>
        어떤 공고의 팀원을 구하세요?
      </h1>
      <p className="cat-sub">
        글쓰기는 특정 공고에 연결돼야 해서, 먼저 공고를 골라주세요. 상단 필터의 지역
        조건({regionLabel})이 여기도 적용돼요.
      </p>
      <input
        className="text-input"
        type="text"
        placeholder="공고 제목이나 내용으로 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginTop: 4 }}
      />
      <div className="divider-list" style={{ marginTop: 20 }}>
        {activityListings.map((l) => (
          <Link className="row" to={`/board/listing/${l.id}/write`} key={l.id}>
            <div className="main">
              <div className="top-line">
                <span className="title">{l.title}</span>
              </div>
              <div className="desc">{l.desc}</div>
            </div>
            {bookmarks.includes(l.id) && <span className="pill-grade">북마크</span>}
            <span className={l.dDay <= 7 ? "pill-alert" : "pill-neutral"}>{formatDDay(l.dDay)}</span>
          </Link>
        ))}
        {activityListings.length === 0 && (
          <p className="cat-sub">조건에 맞는 대외활동 공고가 없어요.</p>
        )}
      </div>
    </div>
  );
}
