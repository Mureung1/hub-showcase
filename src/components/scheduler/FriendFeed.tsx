import { useEffect, useState } from 'react'
import * as commentsApi from './commentsApi'
import type { CommentDto } from './commentsApi'
import { friendPosts, friends, reactionMeta } from './data'
import * as reactionsApi from './reactionsApi'
import type { ReactionSummary } from './reactionsApi'
import { PixelAvatar } from './shared'
import type { FriendPost, ReactionKind } from './types'

type FriendFeedProps = {
  myPosts: FriendPost[]
  currentUserId: string
  onDeletePost: (postId: string) => void
}

export function FriendFeed({ myPosts, currentUserId, onDeletePost }: FriendFeedProps) {
  // mock 친구 게시물(실제 VideoPost가 아님)은 서버에 반응을 저장할 수 없어서 로컬로만 토글한다.
  const [myMockReactions, setMyMockReactions] = useState<Record<string, ReactionKind | null>>({})
  const [reactionSummaries, setReactionSummaries] = useState<Record<string, ReactionSummary>>({})
  const [comments, setComments] = useState<Record<string, CommentDto[]>>({})
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')

  const posts = [...myPosts, ...friendPosts]

  useEffect(() => {
    myPosts.forEach((post) => {
      if (!post.videoUrl || reactionSummaries[post.id]) return
      reactionsApi.fetchReactionSummary(post.id)
        .then((summary) => setReactionSummaries((prev) => ({ ...prev, [post.id]: summary })))
        .catch(() => {})
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPosts])

  const selectReaction = (post: FriendPost, kind: ReactionKind) => {
    if (!post.videoUrl) {
      setMyMockReactions((prev) => ({ ...prev, [post.id]: prev[post.id] === kind ? null : kind }))
      return
    }

    const wasSameReaction = reactionSummaries[post.id]?.myReaction === kind
    const request = wasSameReaction ? reactionsApi.clearReaction(post.id) : reactionsApi.setReaction(post.id, kind)
    request
      .then((summary) => setReactionSummaries((prev) => ({ ...prev, [post.id]: summary })))
      .catch(() => {})
  }

  const toggleComments = (postId: string) => {
    setCommentDraft('')
    if (openCommentsFor === postId) {
      setOpenCommentsFor(null)
      return
    }
    setOpenCommentsFor(postId)
    if (!comments[postId]) {
      commentsApi.fetchComments(postId)
        .then((loaded) => setComments((prev) => ({ ...prev, [postId]: loaded })))
        .catch(() => setComments((prev) => ({ ...prev, [postId]: [] })))
    }
  }

  const submitComment = async (postId: string) => {
    const text = commentDraft.trim()
    if (!text) return
    try {
      const created = await commentsApi.createComment(postId, text)
      setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), created] }))
      setCommentDraft('')
    } catch {
      // 실패하면 입력한 내용을 그대로 두고 재시도할 수 있게 한다.
    }
  }

  const removeComment = async (postId: string, commentId: string) => {
    setComments((prev) => ({ ...prev, [postId]: (prev[postId] ?? []).filter((comment) => comment.id !== commentId) }))
    await commentsApi.deleteComment(postId, commentId).catch(() => {})
  }

  return (
    <div className="friend-feed" aria-label="친구 인증 영상 피드">
      {posts.length === 0 && (
        <p className="empty-agenda">아직 인증 영상이 없어요. 캘린더에서 할 일을 완료하면 여기에 올라와요.</p>
      )}

      {posts.map((post) => {
        const isMine = post.friendId === 'me'
        const friend = friends.find((item) => item.id === post.friendId)
        const summary = reactionSummaries[post.id]
        const myReaction = post.videoUrl ? summary?.myReaction ?? null : myMockReactions[post.id] ?? null
        const reactionCounts = post.videoUrl ? summary?.counts : post.reactions

        return (
          <article className="feed-post" key={post.id}>
            {post.videoUrl ? (
              <div className="feed-video-frame">
                <video className="feed-video-real" src={post.videoUrl} controls playsInline />
                {post.caption && <p className="feed-video-caption">{post.caption}</p>}
              </div>
            ) : (
              <div className={`feed-video tone-${post.tone}`}>
                <span className="feed-play" aria-hidden="true" />
                <time>{post.duration}</time>
              </div>
            )}

            <div className="feed-post-body">
              <header className="feed-post-head">
                {isMine ? <PixelAvatar color="#f2a58d" eyes={2} /> : friend && <PixelAvatar color={friend.color} eyes={friend.eyes} />}
                <div>
                  <strong>{isMine ? '나' : friend?.name ?? '친구'}</strong>
                  <span>{post.categoryName} · {post.timeAgo}</span>
                </div>
                {isMine && (
                  <button
                    type="button"
                    className="feed-delete-button"
                    aria-label="내 게시물 삭제"
                    onClick={() => onDeletePost(post.id)}
                  >
                    <i />
                  </button>
                )}
              </header>

              {!post.videoUrl && <p className="feed-caption">{post.caption}</p>}

              <div className="feed-reactions" role="group" aria-label="눈빛 반응">
                {reactionMeta.map((reaction) => {
                  const count = reactionCounts?.[reaction.key] ?? 0
                  return (
                    <button
                      type="button"
                      key={reaction.key}
                      className={`feed-reaction ${myReaction === reaction.key ? 'active' : ''}`}
                      aria-pressed={myReaction === reaction.key}
                      aria-label={`${reaction.label}(${reaction.hint}) ${count}개`}
                      title={reaction.label}
                      onClick={() => selectReaction(post, reaction.key)}
                    >
                      {reaction.emoji}
                      {count > 0 && <span className="feed-reaction-count">{count}</span>}
                    </button>
                  )
                })}
              </div>

              {post.videoUrl && (
                <div className="feed-comments-section">
                  <button
                    type="button"
                    className="feed-comments-toggle"
                    aria-expanded={openCommentsFor === post.id}
                    onClick={() => toggleComments(post.id)}
                  >
                    댓글 {openCommentsFor === post.id ? '접기' : '보기'}
                  </button>

                  {openCommentsFor === post.id && (
                    <div className="feed-comments">
                      {(comments[post.id] ?? []).length === 0 ? (
                        <p className="empty-agenda">아직 댓글이 없어요.</p>
                      ) : (
                        comments[post.id]?.map((comment) => (
                          <div className="feed-comment" key={comment.id}>
                            <span>
                              <strong>{comment.authorName}</strong> {comment.text}
                            </span>
                            {comment.authorId === currentUserId && (
                              <button
                                type="button"
                                className="feed-comment-delete"
                                aria-label="댓글 삭제"
                                onClick={() => removeComment(post.id, comment.id)}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))
                      )}

                      <form
                        className="feed-comment-form"
                        onSubmit={(event) => {
                          event.preventDefault()
                          submitComment(post.id)
                        }}
                      >
                        <input
                          value={commentDraft}
                          onChange={(event) => setCommentDraft(event.target.value)}
                          placeholder="댓글을 남겨보세요"
                          maxLength={300}
                          aria-label="댓글 입력"
                        />
                        <button type="submit">작성</button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
