import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DocumentSection from '../components/DocumentSection.jsx'
import CommentItem from '../components/CommentItem.jsx'
import TagBadge from '../components/TagBadge.jsx'
import Modal from '../components/Modal.jsx'
import { getSeedDocument } from '../data/documents.js'
import { addCommentToPublished, getPublishedDocument, verifyEditPassword } from '../lib/storage.js'
import { useAuth } from '../lib/AuthContext.jsx'
import './pages.css'

// 문서 전체 AI 총평 코멘트의 sectionId (백엔드와 동일).
const OVERALL_SECTION_ID = '__overall__'

function DocumentDetailPage() {
  const { docId } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  // 시드 문서는 in-memory·문자열 id라 먼저 동기로 잡고, DB 조회를 건너뛴다(uuid만 조회).
  const seedDoc = getSeedDocument(docId)

  const [dbDoc, setDbDoc] = useState(null)
  const [loading, setLoading] = useState(!seedDoc)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  // 시드 문서에 단 코멘트는 저장소가 없어 이번 방문 동안만 유지 (발행 문서는 DB 영속화)
  const [localComments, setLocalComments] = useState([])
  const [openSectionId, setOpenSectionId] = useState(null)
  // 비회원 문서 수정 잠금 해제 모달
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(null)

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
  const overallComments = comments.filter((c) => c.sectionId === OVERALL_SECTION_ID)

  // 수정 가능 여부: 회원 본인 문서, 또는 비밀번호가 걸린 비회원 문서(모달로 해제).
  const isOwner = auth.isLoggedIn && doc.authorId && doc.authorId === auth.user?.id
  const isAnonEditable = !doc.authorId && doc.hasEditPassword
  const canEdit = !seedDoc && (isOwner || isAnonEditable)

  function goEdit(editPassword) {
    navigate(`/write/${doc.templateId}?draft=${doc.id}`, { state: { editPassword } })
  }

  function handleEditClick() {
    if (isOwner) return goEdit()
    setPwInput('')
    setPwError(null)
    setPwModalOpen(true)
  }

  async function handleUnlock() {
    try {
      await verifyEditPassword(doc.id, pwInput)
      setPwModalOpen(false)
      goEdit(pwInput)
    } catch (err) {
      setPwError(err.message ?? '비밀번호가 일치하지 않아요.')
    }
  }

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
          {canEdit && (
            <button type="button" className="rs-btn rs-btn-primary" onClick={handleEditClick}>
              수정하기
            </button>
          )}
        </div>
      </header>

      {overallComments.length > 0 && (
        <section className="rs-panel rs-overall">
          <h2 className="rs-overall-title">AI 총평</h2>
          {overallComments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </section>
      )}

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

      {pwModalOpen && (
        <Modal title="수정용 비밀번호" onClose={() => setPwModalOpen(false)}>
          <p className="rs-overall-hint">
            이 문서를 작성할 때 정한 비밀번호를 입력하면 수정할 수 있어요.
          </p>
          <input
            className="rs-pw-input"
            type="password"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            placeholder="비밀번호"
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            autoFocus
          />
          {pwError && <p className="rs-pw-error">{pwError}</p>}
          <button type="button" className="rs-btn rs-btn-primary" onClick={handleUnlock}>
            수정하러 가기
          </button>
        </Modal>
      )}
    </article>
  )
}

export default DocumentDetailPage
