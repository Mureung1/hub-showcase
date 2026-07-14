import { useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import EditorMetaPanel from '../components/EditorMetaPanel.jsx'
import EditorSection from '../components/EditorSection.jsx'
import { getTemplate } from '../data/templates.js'
import { getChallenge } from '../data/challenges.js'
import { makeAiFeedback } from '../data/aiFeedback.js'
import { loadDrafts, saveDraft, publishDocument } from '../lib/storage.js'
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

  const initial = useRef(null)
  if (initial.current === null && template) {
    const existingDraft = draftParam ? loadDrafts().find((d) => d.id === draftParam) : null
    initial.current = existingDraft ?? {
      id: `draft-${Date.now()}`,
      title: '',
      gameTag: '',
      systemTag: '',
      feedbackWanted: false,
      sections: template.sections.map((s) => ({
        id: nextSectionId(),
        guideKey: s.key,
        heading: s.heading,
        content: '',
      })),
    }
  }

  const [title, setTitle] = useState(initial.current?.title ?? '')
  const [gameTag, setGameTag] = useState(initial.current?.gameTag ?? '')
  const [systemTag, setSystemTag] = useState(initial.current?.systemTag ?? '')
  const [feedbackWanted, setFeedbackWanted] = useState(initial.current?.feedbackWanted ?? false)
  const [sections, setSections] = useState(initial.current?.sections ?? [])
  const [aiComments, setAiComments] = useState({})
  const [aiLoading, setAiLoading] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [publishError, setPublishError] = useState(null)

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

  function buildDraft() {
    return {
      id: initial.current.id,
      templateId,
      title,
      gameTag,
      systemTag,
      feedbackWanted,
      sections,
      updatedAt: new Date().toISOString().slice(0, 10),
    }
  }

  function handleSaveDraft() {
    saveDraft(buildDraft())
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

  function handlePublish() {
    if (title.trim() === '' || gameTag.trim() === '' || systemTag.trim() === '') {
      setPublishError('발행하려면 제목, 대상 게임, 시스템 유형 태그가 모두 필요해요.')
      return
    }
    const docId = initial.current.id.replace('draft-', 'doc-')
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
    publishDocument({
      id: docId,
      author: '나 (데모)',
      type: '역기획',
      templateId,
      status: 'published',
      title: title.trim(),
      gameTag: gameTag.trim(),
      jobTag: JOB_TAG_BY_TEMPLATE[templateId],
      systemTag: systemTag.trim(),
      challengeId: challenge?.id ?? null,
      feedbackWanted,
      likes: 0,
      bookmarks: 0,
      publishedAt: new Date().toISOString().slice(0, 10),
      sections: sections.map(({ id, heading, content }) => ({ id, heading, content })),
      comments,
    })
    navigate(`/archive/${docId}`)
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
        onTitleChange={setTitle}
        onGameTagChange={setGameTag}
        onSystemTagChange={setSystemTag}
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
