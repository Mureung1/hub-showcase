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
import { rememberLocalDoc } from '../lib/localDocs.js'
import { makeSnapshot, hasUnsavedChanges, isEmptyDraft, shouldAutosave } from '../lib/autosave.js'
import './pages.css'
import './EditorPage.css'

const JOB_TAG_BY_TEMPLATE = {
  system: '시스템',
  content: '컨텐츠',
  uiux: 'UI/UX',
  level: '레벨',
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
  // 이미 발행한 문서를 고치는 중인지. 자동저장이 발행 상태를 초안으로 되돌리면 안 된다.
  const [docStatus, setDocStatus] = useState('draft')
  const [title, setTitle] = useState('')
  // 작성 시작 화면에서 게임·시스템을 고르고 왔다면(?game=&system=) 태그를 미리 채운다.
  const [gameTag, setGameTag] = useState(() => searchParams.get('game') ?? '')
  const [systemTag, setSystemTag] = useState(() => searchParams.get('system') ?? '')
  // 둘러보기 필터용 고정 분류. 카탈로그에서 시작했으면 그 시스템의 분류가 미리 채워진다.
  const [category, setCategory] = useState(() => searchParams.get('category') ?? '')
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
  // AI 미리보기 실패 사유. 조용히 mock으로 대체하면 정형 문구를 AI 답변으로 오해한다.
  const [aiPreviewError, setAiPreviewError] = useState(null)
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
    // 비회원 초안은 서버가 비밀번호를 요구한다(잠금해제 모달에서 넘어온 값).
    getPublishedDocument(draftParam, { editPassword: location.state?.editPassword })
      .then((doc) => {
        if (!alive || !doc) return
        setDocId(doc.id)
        setDocStatus(doc.status ?? 'draft')
        setTitle(doc.title ?? '')
        setGameTag(doc.gameTag ?? '')
        setSystemTag(doc.systemTag ?? '')
        setCategory(doc.category ?? '')
        setFeedbackWanted(doc.feedbackWanted ?? false)
        setSections(doc.sections ?? [])
        // 방금 불러온 내용은 이미 저장된 상태다. 스냅샷을 맞춰두지 않으면
        // 로딩 직후 "변경됨"으로 오인해 자동저장이 곧바로 돈다.
        lastSavedRef.current = makeSnapshot({
          title: doc.title ?? '',
          gameTag: doc.gameTag ?? '',
          systemTag: doc.systemTag ?? '',
          category: doc.category ?? '',
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

    const form = { title, gameTag, systemTag, category, feedbackWanted, sections }
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
          status: docStatus, // 발행 문서를 고치는 중이면 발행 상태를 유지한다
          templateId,
          title,
          gameTag,
          systemTag,
          category,
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
    category,
    feedbackWanted,
    sections,
    docId,
    docStatus,
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
        status: docStatus, // 발행 문서를 고치는 중이면 발행 상태를 유지한다
        templateId,
        title,
        gameTag,
        systemTag,
        category,
        feedbackWanted,
        sections,
        editPassword: editPassword || undefined,
      })
      // 수동 저장도 스냅샷을 갱신해야 직후에 자동저장이 중복으로 돌지 않는다.
      lastSavedRef.current = makeSnapshot({
        title,
        gameTag,
        systemTag,
        category,
        feedbackWanted,
        sections,
      })
      setDocId(saved.id) // 첫 저장에서 서버 uuid를 채택, 이후 저장은 같은 row 수정
      setSavedAt(new Date().toLocaleTimeString())
      // 비회원은 계정이 없어 URL을 잃으면 못 찾는다 → 이 브라우저에 기록해 둔다.
      if (!auth.isLoggedIn) {
        rememberLocalDoc({ id: saved.id, title, templateId, status: docStatus })
      }
    } catch (err) {
      setPublishError(err.message ?? '저장에 실패했어요.')
    } finally {
      savingRef.current = false
    }
  }

  function groupBySection(feedback) {
    const grouped = {}
    for (const item of feedback) {
      grouped[item.sectionKey] = [...(grouped[item.sectionKey] ?? []), item.content]
    }
    return grouped
  }

  async function handleAiFeedback() {
    setAiLoading(true)
    setAiPreviewError(null)
    try {
      if (auth.isLoggedIn) {
        // 회원: 실제 Gemini 미리보기(저장 안 함). 섹션 guide·문서 메타를 함께 보내 특화 피드백을 받는다.
        // 실패해도 mock으로 갈아타지 않는다 — 정형 문구를 AI 답변으로 오해하게 되기 때문.
        const feedback = await requestAiFeedbackPreview({
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
        setAiComments(groupBySection(feedback))
      } else {
        // 비회원은 AI를 쓸 수 없다. 어떤 피드백이 오는지 보여주는 예시 미리보기(mock).
        const feedback = await makeAiFeedback(
          sections.map((s) => ({
            key: s.id,
            guideKey: s.guideKey,
            heading: s.heading,
            content: s.content,
          })),
        )
        setAiComments(groupBySection(feedback))
      }
    } catch (err) {
      setAiComments({})
      setAiPreviewError(
        err.status === 429
          ? '오늘 AI 호출 한도를 모두 썼어요. 내일 다시 시도할 수 있어요.'
          : (err.message ?? 'AI 피드백을 받지 못했어요. 잠시 후 다시 시도해 주세요.'),
      )
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
    // 첫 발행인지(= AI 자동 피드백 대상인지). 재발행 때마다 부르면 총평이 계속 쌓인다.
    const isFirstPublish = docStatus !== 'published'
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
        category: category || null,
        challengeId: challenge?.id ?? null,
        feedbackWanted,
        // guideKey를 남겨야 이어쓰기 때 섹션 가이드가 복원되고 AI 재요청도 정확해진다.
        sections: sections.map(({ id, guideKey, heading, content }) => ({
          id,
          guideKey,
          heading,
          content,
        })),
        // 좋아요·북마크·코멘트는 보내지 않는다 — 서버가 관리하며,
        // 여기서 보내면 재발행 때 기존 코멘트와 카운트를 덮어써 지운다.
        editPassword: editPassword || undefined,
      })
      setDocStatus('published')

      // 비회원은 계정이 없어 URL을 잃으면 못 찾는다 → 이 브라우저에 기록해 둔다.
      if (!auth.isLoggedIn) {
        rememberLocalDoc({
          id: published.id,
          title: title.trim(),
          templateId,
          status: 'published',
        })
      }

      // 회원이면 제출 직후 자동 AI 피드백(섹션별 + 전체 총평). 비회원은 건너뛴다.
      // 재발행(수정 반영)에서는 호출하지 않는다 — 상세 페이지에서 직접 다시 받을 수 있다.
      let aiError = null
      if (auth.isLoggedIn && isFirstPublish) {
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
        } catch (err) {
          // 발행 자체는 성공. 다만 실패를 삼키면 총평이 왜 없는지 알 수 없으므로
          // 상세 페이지로 사유를 넘겨 재시도 배너를 띄운다.
          aiError = { message: err.message ?? 'AI 피드백을 받지 못했어요.', status: err.status }
        } finally {
          setAiReviewing(false)
        }
      }
      navigate(`/archive/${published.id}`, { state: { aiError } })
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
        category={category}
        onCategoryChange={setCategory}
        feedbackWanted={feedbackWanted}
        aiLoading={aiLoading}
        savedAt={savedAt}
        autoSaved={autoSaved}
        publishError={publishError}
        aiPreviewError={aiPreviewError}
        isPublished={docStatus === 'published'}
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
