import { useState } from 'react'
import * as commentsApi from './commentsApi'
import type { CommentDto } from './commentsApi'
import { reactionMeta } from './data'
import * as pointsApi from './pointsApi'
import { PixelAvatar, getAvatarProps } from './shared'
import type { FriendPost, ReactionKind } from './types'

type FriendFeedProps = {
  myPosts: FriendPost[]
  friendPosts: FriendPost[]
  currentUserId: string
  onDeletePost: (postId: string) => void
  onPointsEarned: () => void
}

export function FriendFeed({ myPosts, friendPosts, currentUserId, onDeletePost, onPointsEarned }: FriendFeedProps) {
  const [myReactions, setMyReactions] = useState<Record<string, ReactionKind | null>>({})
  const [comments, setComments] = useState<Record<string, CommentDto[]>>({})
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')

  const posts = [...myPosts, ...friendPosts]

  const selectReaction = (postId: string, kind: ReactionKind) => {
    const wasReacted = Boolean(myReactions[postId])
    setMyReactions((prev) => ({ ...prev, [postId]: prev[postId] === kind ? null : kind }))

    // 반응이 없던 상태에서 처음 남길 때만 포인트를 요청한다. 서버가 같은 postId로는
    // 최초 1회만 지급하므로, 지웠다가 다시 남겨도 중복 지급되지 않는다.
    if (!wasReacted) {
      pointsApi.awardReactionPoints(postId).then(onPointsEarned).catch(() => {})
    }
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
        const myReaction = myReactions[post.id] ?? null

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
                {isMine ? <PixelAvatar color="#f2a58d" eyes={2} /> : <PixelAvatar {...getAvatarProps(post.friendId)} />}
                <div>
                  <strong>{isMine ? '나' : post.friendName ?? '친구'}</strong>
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
                {reactionMeta.map((reaction) => (
                  <button
                    type="button"
                    key={reaction.key}
                    className={`feed-reaction ${myReaction === reaction.key ? 'active' : ''}`}
                    aria-pressed={myReaction === reaction.key}
                    aria-label={`${reaction.label}(${reaction.hint})`}
                    title={reaction.label}
                    onClick={() => selectReaction(post.id, reaction.key)}
                  >
                    {reaction.emoji}
                  </button>
                ))}
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
