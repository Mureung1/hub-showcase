import { Link, useOutletContext } from "react-router-dom";

export default function MyPosts() {
  const { myPosts, myComments, boardPosts, listings } = useOutletContext();

  const myBoardPosts = boardPosts
    .filter((p) => myPosts.includes(p.id))
    .sort((a, b) => a.dDay - b.dDay);

  const myBoardComments = boardPosts.flatMap((p) =>
    p.comments.filter((c) => myComments.includes(c.id)).map((c) => ({ ...c, post: p }))
  );

  return (
    <div className="detail">
      <p className="crumb">
        <Link to="/board">홈 / 팀원모집</Link>
      </p>
      <h1 style={{ fontWeight: 800, fontSize: 32, letterSpacing: "-.02em", margin: "0 0 8px" }}>내가 쓴 글</h1>
      <p className="cat-sub">직접 등록한 팀원모집 글이에요. 이 브라우저에만 저장돼요.</p>
      <div className="divider-list">
        {myBoardPosts.map((p) => {
          const listing = listings.find((l) => l.id === p.listingId);
          return (
            <Link className="row" to={`/board/post/${p.id}`} key={p.id}>
              <div className="main">
                <div className="top-line">
                  {listing && <span className="tag">{listing.title}</span>}
                  <span className="title">{p.title}</span>
                  {p.status === "closed" && <span className="pill-neutral">모집완료</span>}
                </div>
                <div className="desc">{p.meta}</div>
              </div>
              <span className={p.dDay <= 7 ? "pill-alert" : "pill-neutral"}>D-{p.dDay}</span>
            </Link>
          );
        })}
        {myBoardPosts.length === 0 && (
          <p className="cat-sub">아직 등록한 팀원모집 글이 없어요. 공고의 팀원모집 화면에서 글을 써보세요.</p>
        )}
      </div>

      <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-.02em", margin: "40px 0 8px" }}>내가 쓴 댓글</h2>
      <p className="cat-sub">직접 남긴 댓글이에요. 이 브라우저에만 저장돼요.</p>
      <div className="divider-list">
        {myBoardComments.map((c) => (
          <Link className="row" to={`/board/post/${c.post.id}`} key={c.id}>
            <div className="main">
              <div className="top-line">
                <span className="tag">{c.post.title}</span>
              </div>
              <div className="desc">{c.text}</div>
            </div>
          </Link>
        ))}
        {myBoardComments.length === 0 && <p className="cat-sub">아직 남긴 댓글이 없어요.</p>}
      </div>
    </div>
  );
}
