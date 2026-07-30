import { Link, useOutletContext, useParams } from "react-router-dom";
import { formatDDay } from "../utils/dday";

export default function Board() {
  const { listingId } = useParams();
  const { boardPosts, listings } = useOutletContext();
  const listing = listingId ? listings.find((l) => l.id === listingId) : null;

  const posts = (listingId
    ? boardPosts.filter((p) => p.listingId === listingId)
    : boardPosts
  ).filter((p) => p.status !== "closed");

  return (
    <div className="detail">
      <p className="crumb">
        <Link to="/">홈</Link>
        {listing && (
          <>
            {" / "}
            <Link to={`/listing/${listing.id}`}>{listing.title}</Link>
          </>
        )}
      </p>

      {listing ? (
        <>
          <div className="board-head">
            <h1 style={{ fontWeight: 800, fontSize: 30, letterSpacing: "-.02em", margin: "0 0 8px" }}>
              {listing.title}의 팀원모집
            </h1>
            <Link
              className="btn-primary"
              style={{ padding: "9px 18px", fontSize: 13 }}
              to={`/board/listing/${listing.id}/write`}
            >
              글쓰기
            </Link>
          </div>
          <p className="cat-sub" style={{ marginTop: 20 }}>{posts.length}건 — 이 공고에 지원하려는 학생만 모여요</p>
        </>
      ) : (
        <>
          <div className="board-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <h1 style={{ fontWeight: 800, fontSize: 32, letterSpacing: "-.02em", margin: "0 0 8px" }}>
              팀원모집
            </h1>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Link
                className="btn-outline"
                style={{ display: "inline-block", width: "auto", whiteSpace: "nowrap", padding: "9px 18px", fontSize: 13 }}
                to="/my-posts"
              >
                내가 쓴 글 보기
              </Link>
              <Link
                className="btn-primary"
                style={{ display: "inline-block", width: "auto", whiteSpace: "nowrap", padding: "9px 18px", fontSize: 13 }}
                to="/board/write"
              >
                글쓰기
              </Link>
            </div>
          </div>
          <p className="cat-sub">
            대외활동을 함께할 팀원을 구하고, 지원할 수 있어요. 글쓰기는 각 공고의 팀원모집
            화면에서 할 수 있어요.
          </p>
        </>
      )}

      <div style={{ marginTop: 28 }}>
        {posts.map((p) => {
          const postListing = listings.find((l) => l.id === p.listingId);
          return (
            <Link className="post-card" to={`/board/post/${p.id}`} key={p.id}>
              <div className="top">
                <span className="title">{p.title}</span>
                <span className={p.dDay <= 7 ? "pill-alert" : "pill-neutral"}>{formatDDay(p.dDay)}</span>
              </div>
              <p className="meta">
                {!listing && (
                  <span style={{ color: "var(--bulb-ink)", fontWeight: 600 }}>{postListing.title} · </span>
                )}
                {p.meta}
              </p>
            </Link>
          );
        })}
        {posts.length === 0 && <p className="cat-sub">아직 등록된 팀원모집 글이 없어요.</p>}
      </div>
      {listing && (
        <Link className="btn-outline" style={{ display: "block", marginTop: 24 }} to="/board">
          목록
        </Link>
      )}
    </div>
  );
}
