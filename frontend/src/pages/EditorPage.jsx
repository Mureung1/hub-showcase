import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import EditorMetaPanel from '../components/EditorMetaPanel.jsx'
import EditorSection from '../components/EditorSection.jsx'
import { getTemplate } from '../data/templates.js'
import { getChallenge } from '../data/challenges.js'
import { makeAiFeedback } from '../data/aiFeedback.js'
import { getPublishedDocument, saveDraft, publishDocument } from '../lib/storage.js'
import './pages.css'
import './EditorPage.css'

const JOB_TAG_BY_TEMPLATE = {
  system: '시스템',
  content: '컨텐츠',
  uiux: 'UI/UX',
  free: '자유',
}

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
  const [savedAt, setSavedAt] = useState(null)
  const [publishError, setPublishError] = useState(null)
  const [loadingDraft, setLoadingDraft] = useState(Boolean(draftParam))

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
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoadingDraft(false)
      })
    return () => {
      alive = false
    }
  }, [draftParam])

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
    const saved = await saveDraft({
      id: docId,
      templateId,
      title,
      gameTag,
      systemTag,
      feedbackWanted,
      sections,
    })
    setDocId(saved.id) // 첫 저장에서 서버 uuid를 채택, 이후 저장은 같은 row 수정
    setSavedAt(new Date().toLocaleTimeString())
  }

  async function handleAiFeedback() {
    setAiLoading(true)
    const feedback = await makeAiFeedback(
      sections.map((s) => ({
        key: s.id,
        guideKey: s.guideKey,
        heading: s.heading,
        content: s.content,
      })),
    )
    const grouped = {}
    for (const item of feedback) {
      grouped[item.sectionKey] = [...(grouped[item.sectionKey] ?? []), item.content]
    }
    setAiComments(grouped)
    setAiLoading(false)
  }

  async function handlePublish() {
    if (title.trim() === '' || gameTag.trim() === '' || systemTag.trim() === '') {
      setPublishError('발행하려면 제목, 대상 게임, 시스템 유형 태그가 모두 필요해요.')
      return
    }
    const comments = sections.flatMap((s) =>
      (aiComments[s.id] ?? []).map((content, i) => ({
        id: `${s.id}-ai-${i}`,
        sectionId: s.id,
        author: null,
        isAi: true,
        content,
        createdAt: new Date().toISOString().slice(0, 10),
      })),
    )
    const published = await publishDocument({
      id: docId, // 저장한 적 있으면 같은 row를 발행으로 flip, 없으면 서버가 새로 발급
      author: '나 (데모)',
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
      comments,
    })
    navigate(`/archive/${published.id}`)
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

      <EditorMetaPanel
        title={title}
        gameTag={gameTag}
        systemTag={systemTag}
        feedbackWanted={feedbackWanted}
        aiLoading={aiLoading}
        savedAt={savedAt}
        publishError={publishError}
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
