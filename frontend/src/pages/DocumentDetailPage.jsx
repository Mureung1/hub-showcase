import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CommentItem from '../components/CommentItem.jsx'
import TagBadge from '../components/TagBadge.jsx'
import { getSeedDocument } from '../data/documents.js'
import { getPublishedDocument } from '../lib/storage.js'
import './pages.css'

function DocumentDetailPage() {
  const { docId } = useParams()
  const doc = getSeedDocument(docId) ?? getPublishedDocument(docId)

  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  // 프로토타입: 새 코멘트는 새로고침 전까지만 유지되는 로컬 상태
  const [localComments, setLocalComments] = useState([])
  const [draftText, setDraftText] = useState('')
  const [draftSectionId, setDraftSectionId] = useState(null)

  if (!doc) {
    return (
      <section className="rs-page-head">
        <h1>문서를 찾을 수 없어요</h1>
        <p>
          <Link to="/archive">둘러보기로 돌아가기</Link>
        </p>
      </section>
    )
  }

  const comments = [...(doc.comments ?? []), ...localComments]

  function submitComment(sectionId) {
    if (draftText.trim() === '') return
    setLocalComments((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        sectionId,
        author: '나 (데모)',
        isAi: false,
        content: draftText.trim(),
        createdAt: '방금',
      },
    ])
    setDraftText('')
    setDraftSectionId(null)
  }

  return (
    <article>
      <header className="rs-page-head">
        <p className="rs-breadcrumb">
          <Link to="/archive">둘러보기</Link> / {doc.gameTag}
        </p>
        <h1>{doc.title}</h1>
        <p className="rs-doc-meta">
          {doc.author} · {doc.publishedAt}
          {doc.challengeId && ' · 챌린지 제출작'}
        </p>
        <div className="rs-doc-tags">
          <TagBadge>{doc.gameTag}</TagBadge>
          <TagBadge>{doc.jobTag}</TagBadge>
          <TagBadge>{doc.systemTag}</TagBadge>
          {doc.feedbackWanted && <TagBadge tone="gold">피드백 요청 중</TagBadge>}
        </div>
        <div className="rs-doc-actions">
          <button type="button" className="rs-btn" onClick={() => setLiked((v) => !v)}>
            {liked ? '좋아요 취소' : '좋아요'} {doc.likes + (liked ? 1 : 0)}
          </button>
          <button type="button" className="rs-btn" onClick={() => setBookmarked((v) => !v)}>
            {bookmarked ? '북마크됨' : '북마크'}
          </button>
        </div>
      </header>

      {doc.sections.map((section) => {
        const sectionComments = comments.filter((c) => c.sectionId === section.id)
        return (
          <section key={section.id} className="rs-panel rs-doc-section">
            <h2>{section.heading}</h2>
            <p className="rs-doc-section-body">{section.content}</p>

            <div className="rs-section-comments">
              {sectionComments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
              {draftSectionId === section.id ? (
                <div className="rs-comment-form">
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="이 섹션에 대한 피드백을 남겨보세요 — 문서 전체가 아니라 섹션 단위라서 더 구체적일 수 있어요."
                    rows={3}
                  />
                  <div className="rs-comment-form-actions">
                    <button
                      type="button"
                      className="rs-btn rs-btn-primary"
                      onClick={() => submitComment(section.id)}
                    >
                      코멘트 등록
                    </button>
                    <button
                      type="button"
                      className="rs-btn"
                      onClick={() => setDraftSectionId(null)}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="rs-chip rs-comment-open"
                  onClick={() => {
                    setDraftSectionId(section.id)
                    setDraftText('')
                  }}
                >
                  + 이 섹션에 코멘트
                </button>
              )}
            </div>
          </section>
        )
      })}
    </article>
  )
}

export default DocumentDetailPage
