import { useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { formatDDay } from "../utils/dday";

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const {
    boardPosts,
    addComment,
    editComment,
    deleteComment,
    listings,
    myPosts,
    myComments,
    closeBoardPost,
    deleteBoardPost,
  } = useOutletContext();
  const post = boardPosts.find((p) => p.id === postId);
  const listing = listings.find((l) => l.id === post.listingId);
  const isOwner = myPosts.includes(post.id);

  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const handleRegister = () => {
    if (!commentText.trim()) return;
    addComment(post.id, { text: commentText.trim() });
    setCommentText("");
  };

  const handleClose = async () => {
    await closeBoardPost(post.id);
    navigate(`/board/listing/${listing.id}`);
  };

  const handleDeletePost = async () => {
    if (!window.confirm("이 글을 삭제할까요? 댓글도 함께 삭제돼요.")) return;
    await deleteBoardPost(post.id);
    navigate(`/board/listing/${listing.id}`);
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditComment = async () => {
    if (!editingCommentText.trim()) return;
    await editComment(post.id, editingCommentId, editingCommentText.trim());
    cancelEditComment();
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    await deleteComment(post.id, commentId);
  };

  return (
    <div className="detail">
      <p className="crumb">
        <Link to={`/board/listing/${listing.id}`}>홈</Link> /{" "}
        <Link to={`/board/listing/${listing.id}`}>팀원모집</Link>
      </p>
      <div className="detail-meta">
        <span className="cat">
          {listing.title} · {formatDDay(post.dDay)}
        </span>
      </div>
      <div className="board-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <h1 style={{ fontSize: 30 }}>{post.title}</h1>
        {isOwner && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0, whiteSpace: "nowrap" }}>
            <Link
              className="btn-outline"
              style={{ display: "inline-block", width: "auto", whiteSpace: "nowrap", padding: "9px 18px", fontSize: 13 }}
              to={`/board/post/${post.id}/edit`}
            >
              수정
            </Link>
            <button
              className="btn-outline"
              style={{ display: "inline-block", width: "auto", whiteSpace: "nowrap", padding: "9px 18px", fontSize: 13 }}
              onClick={handleDeletePost}
            >
              삭제
            </button>
            {post.status !== "closed" && (
              <button
                className="btn-outline"
                style={{ display: "inline-block", width: "auto", whiteSpace: "nowrap", padding: "9px 18px", fontSize: 13 }}
                onClick={handleClose}
              >
                모집완료
              </button>
            )}
          </div>
        )}
      </div>
      <p className="body-txt">{post.body}</p>
      <p className="comment-head">댓글 {post.comments.length}</p>
      {post.comments.map((c, i) => (
        <div className="comment" key={c.id}>
          <div className="who">익명{i + 1}</div>
          {editingCommentId === c.id ? (
            <>
              <textarea
                value={editingCommentText}
                onChange={(e) => setEditingCommentText(e.target.value)}
                style={{ marginTop: 6 }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button className="btn-accent" style={{ padding: "6px 14px", fontSize: 13 }} onClick={saveEditComment}>
                  저장
                </button>
                <button
                  className="btn-outline"
                  style={{ display: "inline-block", width: "auto", padding: "6px 14px", fontSize: 13 }}
                  onClick={cancelEditComment}
                >
                  취소
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="txt">{c.text}</div>
              {myComments.includes(c.id) && (
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <button className="link-btn" onClick={() => startEditComment(c)}>
                    수정
                  </button>
                  <button className="link-btn" onClick={() => handleDeleteComment(c.id)}>
                    삭제
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
      <textarea
        placeholder="댓글로 지원 의사를 남겨보세요"
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
      />
      <button className="btn-accent" style={{ marginTop: 10 }} onClick={handleRegister}>
        등록
      </button>
      <Link className="btn-outline" style={{ display: "block", marginTop: 10 }} to="/board">
        목록
      </Link>
    </div>
  );
}
