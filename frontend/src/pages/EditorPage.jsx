import { useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import CommentItem from '../components/CommentItem.jsx'
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

      <div className="rs-panel rs-editor-meta">
        <input
          className="rs-editor-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="문서 제목 — 예: 스타포스 강화 역기획: 파괴는 왜 필요한가"
          aria-label="문서 제목"
        />
        <div className="rs-editor-tags">
          <input
            value={gameTag}
            onChange={(e) => setGameTag(e.target.value)}
            placeholder="대상 게임 (필수)"
            aria-label="대상 게임 태그"
          />
          <input
            value={systemTag}
            onChange={(e) => setSystemTag(e.target.value)}
            placeholder="시스템 유형 — 예: 강화 시스템 (필수)"
            aria-label="시스템 유형 태그"
          />
          <label className="rs-editor-feedback-toggle">
            <input
              type="checkbox"
              checked={feedbackWanted}
              onChange={(e) => setFeedbackWanted(e.target.checked)}
            />
            피드백 요청 중 배지 켜기
          </label>
        </div>
        <div className="rs-editor-actions">
          <button
            type="button"
            className="rs-btn"
            onClick={handleAiFeedback}
            disabled={aiLoading}
          >
            {aiLoading ? 'AI가 읽는 중…' : 'AI 피드백 받기'}
          </button>
          <button type="button" className="rs-btn" onClick={handleSaveDraft}>
            임시저장
          </button>
          <button type="button" className="rs-btn rs-btn-primary" onClick={handlePublish}>
            발행
          </button>
          {savedAt && <span className="rs-editor-saved">임시저장됨 · {savedAt}</span>}
        </div>
        {publishError && <p className="rs-editor-error">{publishError}</p>}
      </div>

      {sections.map((section) => {
        const guide = guideOf(section)
        return (
          <div key={section.id} className="rs-panel rs-editor-section">
            <div className="rs-editor-section-main">
              <div className="rs-editor-section-head">
                <input
                  className="rs-editor-heading"
                  value={section.heading}
                  onChange={(e) => updateSection(section.id, { heading: e.target.value })}
                  aria-label="섹션 제목"
                />
                <button
                  type="button"
                  className="rs-chip"
                  onClick={() => removeSection(section.id)}
                >
                  섹션 삭제
                </button>
              </div>
              <textarea
                value={section.content}
                onChange={(e) => updateSection(section.id, { content: e.target.value })}
                placeholder={guide.guide}
                rows={6}
              />
              {(aiComments[section.id] ?? []).map((content, i) => (
                <CommentItem
                  key={`${section.id}-ai-${i}`}
                  comment={{ isAi: true, content, createdAt: null }}
                />
              ))}
            </div>
            <aside className="rs-editor-guide">
              <h3>이 섹션에서 다뤄야 할 것</h3>
              <p>{guide.guide}</p>
              {guide.example && (
                <>
                  <h3>잘 쓴 예시</h3>
                  <p className="rs-editor-guide-example">{guide.example}</p>
                </>
              )}
            </aside>
          </div>
        )
      })}

      <button type="button" className="rs-btn rs-editor-add" onClick={addSection}>
        + 섹션 추가
      </button>
    </section>
  )
}

export default EditorPage
