import { useState } from 'react'
import { friendPosts, friends, reactionMeta } from './data'
import { PixelAvatar } from './shared'
import type { FriendPost, ReactionKind } from './types'

type FriendFeedProps = {
  myPosts: FriendPost[]
  onDeletePost: (postId: number) => void
}

export function FriendFeed({ myPosts, onDeletePost }: FriendFeedProps) {
  const [myReactions, setMyReactions] = useState<Record<number, ReactionKind | null>>({})

  const posts = [...myPosts, ...friendPosts]

  const selectReaction = (postId: number, kind: ReactionKind) => {
    setMyReactions((prev) => ({ ...prev, [postId]: prev[postId] === kind ? null : kind }))
  }

  return (
    <div className="friend-feed" aria-label="친구 인증 영상 피드">
      {posts.length === 0 && (
        <p className="empty-agenda">아직 인증 영상이 없어요. 캘린더에서 할 일을 완료하면 여기에 올라와요.</p>
      )}

      {posts.map((post) => {
        const isMine = post.friendId === 'me'
        const friend = friends.find((item) => item.id === post.friendId)
        const myReaction = myReactions[post.id] ?? null

        return (
          <article className="feed-post" key={post.id}>
            {post.videoUrl ? (
              <video className="feed-video-real" src={post.videoUrl} controls playsInline />
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

              <p className="feed-caption">{post.caption}</p>

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
            </div>
          </article>
        )
      })}
    </div>
  )
}
