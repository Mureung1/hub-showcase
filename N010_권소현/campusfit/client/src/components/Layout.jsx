import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { regionOptions, gradeOptions } from "../data/mockListings";
import { api } from "../api/client";

const BOOKMARKS_KEY = "campusfit-bookmarks";
const MY_POSTS_KEY = "campusfit-my-posts";
const MY_COMMENTS_KEY = "campusfit-my-comments";
const MY_POST_TOKENS_KEY = "campusfit-my-post-tokens";
const MY_COMMENT_TOKENS_KEY = "campusfit-my-comment-tokens";

function loadMyPosts() {
  try {
    const saved = localStorage.getItem(MY_POSTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}
function loadMyComments() {
  try {
    const saved = localStorage.getItem(MY_COMMENTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}
// 글/댓글마다 서버가 발급한 소유자 토큰을 id별로 저장해둔다 — 수정·삭제 요청 때 같이 보내서
// "이 브라우저가 진짜 작성자인지" 서버가 확인할 수 있게 한다.
function loadTokenMap(key) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}
function loadBookmarks() {
  try {
    const saved = localStorage.getItem(BOOKMARKS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export default function Layout() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [region, setRegion] = useState("all");
  const [grade, setGrade] = useState("all");
  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [boardPosts, setBoardPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [bookmarks, setBookmarks] = useState(loadBookmarks);
  const [myPosts, setMyPosts] = useState(loadMyPosts);
  const [myComments, setMyComments] = useState(loadMyComments);
  const [myPostTokens, setMyPostTokens] = useState(() => loadTokenMap(MY_POST_TOKENS_KEY));
  const [myCommentTokens, setMyCommentTokens] = useState(() => loadTokenMap(MY_COMMENT_TOKENS_KEY));

  useEffect(() => {
    Promise.all([api.getCategories(), api.getListings(), api.getBoardPosts(), api.getYouthPolicies()])
  .then(([cats, ls, posts, youthPolicies]) => {
    setCategories(cats);
    setListings([...ls, ...youthPolicies]);
    setBoardPosts(posts);
  })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);
  const addBoardPost = async (post) => {
  const created = await api.addBoardPost(post);
  const { ownerToken, ...createdPost } = created;
  setBoardPosts((prev) => [...prev, createdPost]);
  setMyPosts((prev) => [...prev, created.id]);
  setMyPostTokens((prev) => ({ ...prev, [created.id]: ownerToken }));
  return createdPost;
};

  const editBoardPost = async (postId, post) => {
    const updated = await api.editBoardPost(postId, post, myPostTokens[postId]);
    setBoardPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    return updated;
  };

  const deleteBoardPost = async (postId) => {
    await api.deleteBoardPost(postId, myPostTokens[postId]);
    setBoardPosts((prev) => prev.filter((p) => p.id !== postId));
    setMyPosts((prev) => prev.filter((id) => id !== postId));
    setMyPostTokens((prev) => {
      const { [postId]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const addComment = async (postId, comment) => {
    const saved = await api.addComment(postId, comment);
    const { ownerToken, ...savedComment } = saved;
    setBoardPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, savedComment] } : p))
    );
    setMyComments((prev) => [...prev, saved.id]);
    setMyCommentTokens((prev) => ({ ...prev, [saved.id]: ownerToken }));
    return savedComment;
  };

  const editComment = async (postId, commentId, text) => {
    await api.editComment(postId, commentId, text, myCommentTokens[commentId]);
    setBoardPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments.map((c) => (c.id === commentId ? { ...c, text } : c)) }
          : p
      )
    );
  };

  const deleteComment = async (postId, commentId) => {
    await api.deleteComment(postId, commentId, myCommentTokens[commentId]);
    setBoardPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p
      )
    );
    setMyComments((prev) => prev.filter((id) => id !== commentId));
    setMyCommentTokens((prev) => {
      const { [commentId]: _removed, ...rest } = prev;
      return rest;
    });
  };

const closeBoardPost = async (postId) => {
  await api.closeBoardPost(postId, myPostTokens[postId]);
  setBoardPosts((prev) =>
    prev.map((p) => (p.id === postId ? { ...p, status: "closed" } : p))
  );
};
  useEffect(() => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);
useEffect(() => {
  localStorage.setItem(MY_POSTS_KEY, JSON.stringify(myPosts));
}, [myPosts]);
useEffect(() => {
  localStorage.setItem(MY_COMMENTS_KEY, JSON.stringify(myComments));
}, [myComments]);
useEffect(() => {
  localStorage.setItem(MY_POST_TOKENS_KEY, JSON.stringify(myPostTokens));
}, [myPostTokens]);
useEffect(() => {
  localStorage.setItem(MY_COMMENT_TOKENS_KEY, JSON.stringify(myCommentTokens));
}, [myCommentTokens]);
  const toggleBookmark = (listingId) =>
    setBookmarks((prev) =>
      prev.includes(listingId) ? prev.filter((id) => id !== listingId) : [...prev, listingId]
    );

  const regionLabel = regionOptions.find((o) => o.value === region).label;
  const gradeLabel = gradeOptions.find((o) => o.value === grade).label;

  const navLinkClass = ({ isActive }) => (isActive ? "active" : undefined);

  return (
    <>
      <header className="topnav">
        <div className="topnav-inner">
          <NavLink className="logo" to="/" style={{ textDecoration: "none", color: "inherit" }}>
            캠퍼스핏
          </NavLink>
          <nav className="nav-links">
            <NavLink to="/" end className={navLinkClass}>
              홈
            </NavLink>
            {categories.map((c) => (
              <NavLink key={c.id} to={`/category/${c.id}`} className={navLinkClass}>
                {c.label}
              </NavLink>
            ))}
            <NavLink to="/board" className={navLinkClass}>
              팀원모집
            </NavLink>
            <NavLink to="/bookmarks" className={navLinkClass}>
              북마크
            </NavLink>
          </nav>
          <div className="filter-wrap">
            <button className="filter-btn" onClick={() => setIsFilterOpen(!isFilterOpen)}>
              {region === "all" ? "지역" : regionLabel} · {grade === "all" ? "학년" : gradeLabel}
              <span className="chev">▾</span>
            </button>
            {isFilterOpen && (
              <>
                <button
                  className="filter-scrim"
                  onClick={() => setIsFilterOpen(false)}
                  aria-label="필터 닫기"
                />
                <div className="filter-dd">
                  <p className="filter-label">
                    지역 <span className="filter-note">— 재학 학교 소재지 기준</span>
                  </p>
                  <div className="chip-row scroll">
                    {regionOptions.map((o) => (
                      <button
                        key={o.value}
                        className={`chip sm ${region === o.value ? "active" : ""}`}
                        onClick={() => setRegion(o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <p className="filter-label">
                    학년 <span className="filter-note">— 학년 조건이 있는 공고에만 적용돼요</span>
                  </p>
                  <div className="chip-row">
                    {gradeOptions.map((o) => (
                      <button
                        key={o.value}
                        className={`chip ${grade === o.value ? "active" : ""}`}
                        onClick={() => setGrade(o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <button className="filter-apply" onClick={() => setIsFilterOpen(false)}>
                    확인
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {loading ? (
        <p className="cat-sub" style={{ textAlign: "center", padding: "96px 24px" }}>
          불러오는 중...
        </p>
      ) : loadError ? (
        <p className="cat-sub" style={{ textAlign: "center", padding: "96px 24px" }}>
          서버에 연결할 수 없어요 — server가 켜져 있는지 확인해주세요. ({loadError})
        </p>
      ) : (
        <Outlet
          context={{
            regionLabel,
            gradeLabel,
            region,
            grade,
            openFilter: () => setIsFilterOpen(true),
            categories,
            listings,
            boardPosts,
            addBoardPost,
            editBoardPost,
            deleteBoardPost,
            addComment,
            editComment,
            deleteComment,
            bookmarks,
            toggleBookmark,
            myPosts,
            myComments,
            closeBoardPost,
          }}
        />
      )}

      <footer>
        <div className="inner">
          <span className="brand">캠퍼스핏</span>
          <span className="note">대학생을 위한 정보 큐레이션 · 실제 서비스가 아닌 프로토타입입니다.</span>
        </div>
      </footer>
    </>
  );
}
