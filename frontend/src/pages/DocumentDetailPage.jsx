import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DocumentSection from '../components/DocumentSection.jsx'
import TagBadge from '../components/TagBadge.jsx'
import { getSeedDocument } from '../data/documents.js'
import { addCommentToPublished, getPublishedDocument } from '../lib/storage.js'
import './pages.css'

function DocumentDetailPage() {
  const { docId } = useParams()
  // 시드 문서는 in-memory·문자열 id라 먼저 동기로 잡고, DB 조회를 건너뛴다(uuid만 조회).
  const seedDoc = getSeedDocument(docId)

  const [dbDoc, setDbDoc] = useState(null)
  const [loading, setLoading] = useState(!seedDoc)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  // 시드 문서에 단 코멘트는 저장소가 없어 이번 방문 동안만 유지 (발행 문서는 DB 영속화)
  const [localComments, setLocalComments] = useState([])
  const [openSectionId, setOpenSectionId] = useState(null)

  useEffect(() => {
    if (seedDoc) return
    let alive = true
    getPublishedDocument(docId)
      .then((doc) => alive && setDbDoc(doc))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [docId, seedDoc])

  const doc = seedDoc ?? dbDoc

  if (loading) {
    return (
      <section className="rs-page-head">
        <h1>문서를 불러오는 중…</h1>
      </section>
    )
  }

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

  async function submitComment(sectionId, text) {
    const comment = {
      id: `local-${Date.now()}`,
      sectionId,
      author: '나 (데모)',
      isAi: false,
      content: text,
      createdAt: '방금',
    }
    if (seedDoc) {
      // 시드 문서는 저장소가 없으므로 이번 방문 동안만 로컬 state로 보여준다
      setLocalComments((prev) => [...prev, comment])
    } else {
      // 발행 문서는 DB에 저장하고, 서버가 돌려준 코멘트로 낙관적 반영
      const saved = await addCommentToPublished(doc.id, comment)
      setDbDoc((prev) => ({ ...prev, comments: [...(prev.comments ?? []), saved] }))
    }
    setOpenSectionId(null)
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

      {doc.sections.map((section) => (
        <DocumentSection
          key={section.id}
          section={section}
          comments={comments.filter((c) => c.sectionId === section.id)}
          isFormOpen={openSectionId === section.id}
          onOpenForm={() => setOpenSectionId(section.id)}
          onSubmitComment={(text) => submitComment(section.id, text)}
          onCancelForm={() => setOpenSectionId(null)}
        />
      ))}
    </article>
  )
}

export default DocumentDetailPage
