import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import DocumentSection from '../components/DocumentSection.jsx'
import CommentItem from '../components/CommentItem.jsx'
import TagBadge from '../components/TagBadge.jsx'
import Modal from '../components/Modal.jsx'
import { getSeedDocument } from '../data/documents.js'
import { getTemplate } from '../data/templates.js'
import {
  addCommentToPublished,
  getPublishedDocument,
  verifyEditPassword,
  requestAiFeedback,
  getReactions,
  toggleReaction,
} from '../lib/storage.js'
import { useAuth } from '../lib/AuthContext.jsx'
import './pages.css'

// 문서 전체 AI 총평 코멘트의 sectionId (백엔드와 동일).
const OVERALL_SECTION_ID = '__overall__'

function DocumentDetailPage() {
  const { docId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  // 시드 문서는 in-memory·문자열 id라 먼저 동기로 잡고, DB 조회를 건너뛴다(uuid만 조회).
  const seedDoc = getSeedDocument(docId)

  const [dbDoc, setDbDoc] = useState(null)
  const [loading, setLoading] = useState(!seedDoc)
  // 좋아요/북마크는 서버에 영속된다(유저당 1회). null이면 아직 못 불러온 상태.
  const [reactions, setReactions] = useState(null)
  // 시드 문서에 단 코멘트는 저장소가 없어 이번 방문 동안만 유지 (발행 문서는 DB 영속화)
  const [localComments, setLocalComments] = useState([])
  const [openSectionId, setOpenSectionId] = useState(null)
  // 비회원 문서 수정 잠금 해제 모달
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(null)
  // 로딩 실패를 조용히 삼키지 않는다(빈 화면 = "글 없음"으로 오인되므로).
  const [loadError, setLoadError] = useState(null)
  // 발행 직후 AI 실패 사유(EditorPage가 navigate state로 넘겨준다) + 재시도 상태
  const [aiError, setAiError] = useState(location.state?.aiError ?? null)
  const [aiRetrying, setAiRetrying] = useState(false)

  useEffect(() => {
    if (seedDoc) return
    let alive = true
    getPublishedDocument(docId)
      .then((doc) => alive && setDbDoc(doc))
      .catch((err) => alive && setLoadError(err.message ?? '문서를 불러오지 못했어요.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [docId, seedDoc])

  // 반응 상태(카운트 + 내가 눌렀는지). 시드 문서는 DB에 없어 건너뛴다.
  useEffect(() => {
    if (seedDoc) return
    let alive = true
    getReactions(docId)
      .then((r) => alive && setReactions(r))
      .catch(() => {}) // 반응 조회 실패는 본문 열람을 막지 않는다
    return () => {
      alive = false
    }
  }, [docId, seedDoc, auth.isLoggedIn])

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
          {loadError
            ? `${loadError} 비공개 초안이거나 링크가 잘못됐을 수 있어요.`
            : '비공개 초안이거나 링크가 잘못됐을 수 있어요.'}
        </p>
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

  // 좋아요/북마크는 유저당 1회라 로그인이 필요하다(시드 문서는 DB에 없어 제외).
  const canReact = !seedDoc && auth.isLoggedIn

  async function handleReaction(type) {
    try {
      setReactions(await toggleReaction(doc.id, type))
    } catch {
      // 실패해도 화면을 깨뜨리지 않는다(다음 조회에서 정정됨).
    }
  }

  // 내 문서인데 AI 총평이 없으면(실패했거나 아직 못 받음) 재시도할 수 있게 한다.
  async function retryAiFeedback() {
    setAiRetrying(true)
    setAiError(null)
    try {
      // 섹션의 guideKey로 템플릿 가이드를 복원한다.
      // guideKey를 저장하기 전에 발행된 문서를 위해 heading 매칭을 폴백으로 남긴다.
      const template = getTemplate(doc.templateId)
      const guides = (doc.sections ?? []).map((s) => ({
        sectionId: s.id,
        heading: s.heading,
        guide: (
          template?.sections.find((t) => t.key === s.guideKey) ??
          template?.sections.find((t) => t.heading === s.heading)
        )?.guide,
      }))
      await requestAiFeedback(doc.id, {
        title: doc.title,
        gameTag: doc.gameTag,
        templateName: template?.name,
        guides,
      })
      const refreshed = await getPublishedDocument(doc.id)
      setDbDoc(refreshed)
    } catch (err) {
      setAiError({ message: err.message ?? 'AI 피드백을 받지 못했어요.', status: err.status })
    } finally {
      setAiRetrying(false)
    }
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
    if (seedDoc) {
      // 시드 문서는 저장소가 없으므로 이번 방문 동안만 로컬 state로 보여준다
      setLocalComments((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          sectionId,
          author: auth.isLoggedIn ? (auth.user.email?.split('@')[0] ?? '나') : '익명',
          isAi: false,
          content: text,
          createdAt: '방금',
        },
      ])
    } else {
      // 발행 문서는 DB에 저장. 작성자명·is_ai는 서버가 결정하므로 보내지 않는다.
      const saved = await addCommentToPublished(doc.id, { sectionId, content: text })
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
          {doc.isExample && <TagBadge tone="gold">AI 예시</TagBadge>}
          {doc.feedbackWanted && <TagBadge tone="gold">피드백 요청 중</TagBadge>}
        </div>
        {doc.isExample && (
          <p className="rs-example-notice">
            AI가 작성한 <strong>학습용 참고 예시</strong>입니다. 구조와 서술 방식을 참고하는
            용도이며, 수치는 추정치라 실제 게임과 다를 수 있어요.
          </p>
        )}
        <div className="rs-doc-actions">
          <button
            type="button"
            className="rs-btn"
            onClick={() => handleReaction('like')}
            disabled={!canReact}
            title={canReact ? undefined : '로그인하면 좋아요를 누를 수 있어요'}
          >
            {reactions?.liked ? '좋아요 취소' : '좋아요'} {reactions?.likes ?? doc.likes}
          </button>
          <button
            type="button"
            className="rs-btn"
            onClick={() => handleReaction('bookmark')}
            disabled={!canReact}
            title={canReact ? undefined : '로그인하면 북마크할 수 있어요'}
          >
            {reactions?.bookmarked ? '북마크됨' : '북마크'}
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

      {/* 내 문서인데 AI 총평이 없으면 왜 없는지 알리고 재시도할 수 있게 한다. */}
      {!seedDoc && isOwner && overallComments.length === 0 && (
        <section className="rs-panel rs-overall">
          <h2 className="rs-overall-title">AI 피드백</h2>
          <p className="rs-overall-hint">
            {aiError?.status === 429
              ? 'AI 피드백 일일 한도를 모두 썼어요. 내일 다시 시도할 수 있어요.'
              : (aiError?.message ?? '이 문서에는 아직 AI 피드백이 없어요.')}
          </p>
          {aiError?.status !== 429 && (
            <button
              type="button"
              className="rs-btn rs-btn-primary"
              onClick={retryAiFeedback}
              disabled={aiRetrying}
            >
              {aiRetrying ? 'AI가 읽는 중…' : 'AI 피드백 받기'}
            </button>
          )}
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
