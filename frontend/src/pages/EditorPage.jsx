import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import EditorMetaPanel from '../components/EditorMetaPanel.jsx'
import EditorSection from '../components/EditorSection.jsx'
import { getTemplate } from '../data/templates.js'
import { getChallenge } from '../data/challenges.js'
import { makeAiFeedback } from '../data/aiFeedback.js'
import {
  getPublishedDocument,
  saveDraft,
  publishDocument,
  requestAiFeedback,
  requestAiFeedbackPreview,
} from '../lib/storage.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { makeSnapshot, hasUnsavedChanges, isEmptyDraft, shouldAutosave } from '../lib/autosave.js'
import './pages.css'
import './EditorPage.css'

const JOB_TAG_BY_TEMPLATE = {
  system: '시스템',
  content: '컨텐츠',
  uiux: 'UI/UX',
  free: '자유',
}

// 타이핑이 멈추고 이만큼 지나면 자동저장한다.
const AUTOSAVE_DELAY_MS = 2000

const CUSTOM_SECTION_GUIDE =
  '직접 추가한 섹션이에요. 읽는 사람이 이 섹션에서 무엇을 기대해야 하는지, 제목이 말해주고 있는지 확인해 보세요.'

let sectionSeq = 0
function nextSectionId() {
  sectionSeq += 1
  return `sec-${Date.now()}-${sectionSeq}`
}

function EditorPage() {
  const { templateId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuth()

  const template = getTemplate(templateId)
  const challenge = getChallenge(searchParams.get('challenge'))
  const draftParam = searchParams.get('draft')

  // 문서 식별자는 서버가 발급한 uuid 하나로 통일한다(신규는 null, 첫 저장 때 채워짐).
  const [docId, setDocId] = useState(null)
  const [title, setTitle] = useState('')
  const [gameTag, setGameTag] = useState('')
  const [systemTag, setSystemTag] = useState('')
  const [feedbackWanted, setFeedbackWanted] = useState(false)
  // 신규 문서는 템플릿 프리셋으로 즉시 초기화, 이어쓰기는 아래 useEffect에서 서버 데이터로 채운다.
  const [sections, setSections] = useState(() =>
    template && !draftParam
      ? template.sections.map((s) => ({
          id: nextSectionId(),
          guideKey: s.key,
          heading: s.heading,
          content: '',
        }))
      : [],
  )
  const [aiComments, setAiComments] = useState({})
  const [aiLoading, setAiLoading] = useState(false)
  const [aiReviewing, setAiReviewing] = useState(false)
  // 비회원 문서 수정용 비밀번호. 잠금해제 모달에서 넘어온 경우 location.state 로 받는다.
  const [editPassword, setEditPassword] = useState(location.state?.editPassword ?? '')
  const [savedAt, setSavedAt] = useState(null)
  const [publishError, setPublishError] = useState(null)
  const [loadingDraft, setLoadingDraft] = useState(Boolean(draftParam))
  const [autoSaved, setAutoSaved] = useState(false)
  // 마지막으로 저장된 내용의 스냅샷과 저장 진행 여부 — 리렌더를 유발할 필요가 없어 ref로 둔다.
  const lastSavedRef = useRef(null)
  const savingRef = useRef(false)

  // 초안 이어쓰기(?draft=<uuid>): 서버에서 불러와 폼을 채운다.
  useEffect(() => {
    if (!draftParam) return
    let alive = true
    getPublishedDocument(draftParam)
      .then((doc) => {
        if (!alive || !doc) return
        setDocId(doc.id)
        setTitle(doc.title ?? '')
        setGameTag(doc.gameTag ?? '')
        setSystemTag(doc.systemTag ?? '')
        setFeedbackWanted(doc.feedbackWanted ?? false)
        setSections(doc.sections ?? [])
        // 방금 불러온 내용은 이미 저장된 상태다. 스냅샷을 맞춰두지 않으면
        // 로딩 직후 "변경됨"으로 오인해 자동저장이 곧바로 돈다.
        lastSavedRef.current = makeSnapshot({
          title: doc.title ?? '',
          gameTag: doc.gameTag ?? '',
          systemTag: doc.systemTag ?? '',
          feedbackWanted: doc.feedbackWanted ?? false,
          sections: doc.sections ?? [],
        })
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoadingDraft(false)
      })
    return () => {
      alive = false
    }
  }, [draftParam])

  // 자동저장 — 타이핑이 멈추면 저장한다.
  // 이 useEffect는 아래 early return들보다 반드시 위에 있어야 한다(조건부 훅 호출 금지).
  useEffect(() => {
    // 이어쓰기로 초안을 불러오는 중이면 절대 저장하지 않는다.
    // 여기서 저장이 돌면 아직 안 채워진 빈 폼이 기존 초안을 덮어쓴다.
    if (loadingDraft || !template) return
    // 비회원은 수정용 비밀번호가 있어야 저장할 수 있다(그래야 이후에 다시 고칠 수 있음).
    if (!auth.isLoggedIn && !editPassword) return

    const form = { title, gameTag, systemTag, feedbackWanted, sections }
    const snapshot = makeSnapshot(form)
    const decision = shouldAutosave({
      hasChanges: hasUnsavedChanges(snapshot, lastSavedRef.current),
      isEmpty: isEmptyDraft(form),
      isSaving: savingRef.current,
    })
    if (!decision) return

    const timer = setTimeout(async () => {
      savingRef.current = true
      try {
        const saved = await saveDraft({
          id: docId,
          templateId,
          title,
          gameTag,
          systemTag,
          feedbackWanted,
          sections,
          editPassword: editPassword || undefined,
        })
        lastSavedRef.current = snapshot
        setDocId(saved.id)
        setSavedAt(new Date().toLocaleTimeString())
        setAutoSaved(true)
      } catch {
        // 자동저장 실패는 조용히 넘긴다 — 수동 저장·발행 시 사용자에게 알려진다
      } finally {
        savingRef.current = false
      }
    }, AUTOSAVE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [
    title,
    gameTag,
    systemTag,
    feedbackWanted,
    sections,
    docId,
    templateId,
    loadingDraft,
    template,
    editPassword,
    auth.isLoggedIn,
  ])

  if (!template) {
    return (
      <section className="rs-page-head">
        <h1>없는 템플릿이에요</h1>
        <p>
          <Link to="/write">템플릿 선택으로 돌아가기</Link>
        </p>
      </section>
    )
  }

  if (loadingDraft) {
    return (
      <section className="rs-page-head">
        <h1>초안을 불러오는 중…</h1>
      </section>
    )
  }

  const guideOf = (section) =>
    template.sections.find((s) => s.key === section.guideKey) ?? {
      guide: CUSTOM_SECTION_GUIDE,
      example: null,
    }

  function updateSection(id, patch) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function removeSection(id) {
    setSections((prev) => prev.filter((s) => s.id !== id))
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      { id: nextSectionId(), guideKey: null, heading: '새 섹션', content: '' },
    ])
  }

  async function handleSaveDraft() {
    if (!auth.isLoggedIn && !editPassword) {
      setPublishError('비회원은 "수정용 비밀번호"를 먼저 입력해야 저장할 수 있어요.')
      return
    }
    savingRef.current = true
    setAutoSaved(false)
    try {
      const saved = await saveDraft({
        id: docId,
        templateId,
        title,
        gameTag,
        systemTag,
        feedbackWanted,
        sections,
        editPassword: editPassword || undefined,
      })
      // 수동 저장도 스냅샷을 갱신해야 직후에 자동저장이 중복으로 돌지 않는다.
      lastSavedRef.current = makeSnapshot({ title, gameTag, systemTag, feedbackWanted, sections })
      setDocId(saved.id) // 첫 저장에서 서버 uuid를 채택, 이후 저장은 같은 row 수정
      setSavedAt(new Date().toLocaleTimeString())
    } catch (err) {
      setPublishError(err.message ?? '저장에 실패했어요.')
    } finally {
      savingRef.current = false
    }
  }

  async function handleAiFeedback() {
    setAiLoading(true)
    try {
      let feedback
      if (auth.isLoggedIn) {
        // 회원: 실제 Gemini 미리보기(저장 안 함). 섹션 guide·문서 메타를 함께 보내 특화 피드백을 받는다.
        feedback = await requestAiFeedbackPreview({
          title: title.trim(),
          gameTag: gameTag.trim(),
          templateName: template.name,
          sections: sections.map((s) => ({
            key: s.id,
            heading: s.heading,
            content: s.content,
            guide: guideOf(s).guide,
          })),
        })
      } else {
        // 비회원/폴백: mock 미리보기.
        feedback = await makeAiFeedback(
          sections.map((s) => ({
            key: s.id,
            guideKey: s.guideKey,
            heading: s.heading,
            content: s.content,
          })),
        )
      }
      const grouped = {}
      for (const item of feedback) {
        grouped[item.sectionKey] = [...(grouped[item.sectionKey] ?? []), item.content]
      }
      setAiComments(grouped)
    } catch {
      // 실 API 실패 시 mock으로 폴백(오프라인/한도 등 안전망).
      const fallback = await makeAiFeedback(
        sections.map((s) => ({
          key: s.id,
          guideKey: s.guideKey,
          heading: s.heading,
          content: s.content,
        })),
      )
      const grouped = {}
      for (const item of fallback) {
        grouped[item.sectionKey] = [...(grouped[item.sectionKey] ?? []), item.content]
      }
      setAiComments(grouped)
    } finally {
      setAiLoading(false)
    }
  }

  async function handlePublish() {
    if (title.trim() === '' || gameTag.trim() === '' || systemTag.trim() === '') {
      setPublishError('발행하려면 제목, 대상 게임, 시스템 유형 태그가 모두 필요해요.')
      return
    }
    if (!auth.isLoggedIn && !editPassword) {
      setPublishError('비회원은 "수정용 비밀번호"를 먼저 입력해야 발행할 수 있어요.')
      return
    }
    try {
      const published = await publishDocument({
        id: docId, // 저장한 적 있으면 같은 row를 발행으로 flip, 없으면 서버가 새로 발급
        // 회원이면 author_name은 서버가 프로필로 채운다. 비회원만 표시명을 보낸다.
        author: auth.isLoggedIn ? undefined : '익명',
        type: '역기획',
        templateId,
        title: title.trim(),
        gameTag: gameTag.trim(),
        jobTag: JOB_TAG_BY_TEMPLATE[templateId],
        systemTag: systemTag.trim(),
        challengeId: challenge?.id ?? null,
        feedbackWanted,
        likes: 0,
        bookmarks: 0,
        sections: sections.map(({ id, heading, content }) => ({ id, heading, content })),
        // AI 코멘트는 아래에서 회원 전용 엔드포인트가 서버에 직접 append 한다(중복 방지).
        comments: [],
        editPassword: editPassword || undefined,
      })

      // 회원이면 제출 직후 자동 AI 피드백(섹션별 + 전체 총평). 비회원은 건너뛴다.
      if (auth.isLoggedIn) {
        setAiReviewing(true)
        try {
          // 섹션별 guide(그 섹션이 다뤄야 하는 것)와 문서 메타를 함께 보내야
          // 백엔드가 섹션 성격에 맞는 특화 피드백을 낸다.
          const guides = sections.map((s) => ({
            sectionId: s.id,
            heading: s.heading,
            guide: guideOf(s).guide,
          }))
          await requestAiFeedback(published.id, {
            title: title.trim(),
            gameTag: gameTag.trim(),
            templateName: template.name,
            guides,
          })
        } catch {
          // AI 실패해도 발행 자체는 성공 — 상세 페이지로 넘어간다.
        } finally {
          setAiReviewing(false)
        }
      }
      navigate(`/archive/${published.id}`)
    } catch (err) {
      setPublishError(err.message ?? '발행에 실패했어요.')
    }
  }

  return (
    <section>
      <header className="rs-page-head">
        <p className="rs-breadcrumb">
          <Link to="/write">작성하기</Link> / {template.name}
        </p>
        <h1>{template.name}</h1>
        {challenge && (
          <p className="rs-editor-challenge">
            챌린지 참가 중 — {challenge.title} (제출 마감 {challenge.submitDeadline})
          </p>
        )}
      </header>

      {aiReviewing && (
        <div className="rs-panel rs-editor-reviewing" role="status">
          AI가 방금 발행한 문서를 검토하고 있어요… 잠시만요.
        </div>
      )}

      <EditorMetaPanel
        title={title}
        gameTag={gameTag}
        systemTag={systemTag}
        feedbackWanted={feedbackWanted}
        aiLoading={aiLoading}
        savedAt={savedAt}
        autoSaved={autoSaved}
        publishError={publishError}
        isLoggedIn={auth.isLoggedIn}
        showPasswordField={!auth.isLoggedIn}
        editPassword={editPassword}
        onEditPasswordChange={setEditPassword}
        onTitleChange={(v) => {
          setTitle(v)
          setPublishError(null)
        }}
        onGameTagChange={(v) => {
          setGameTag(v)
          setPublishError(null)
        }}
        onSystemTagChange={(v) => {
          setSystemTag(v)
          setPublishError(null)
        }}
        onFeedbackWantedChange={setFeedbackWanted}
        onAiFeedback={handleAiFeedback}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
      />

      {sections.map((section) => (
        <EditorSection
          key={section.id}
          section={section}
          guide={guideOf(section)}
          aiComments={aiComments[section.id] ?? []}
          onChange={(patch) => updateSection(section.id, patch)}
          onRemove={() => removeSection(section.id)}
        />
      ))}

      <button type="button" className="rs-btn rs-editor-add" onClick={addSection}>
        + 섹션 추가
      </button>
    </section>
  )
}

export default EditorPage
