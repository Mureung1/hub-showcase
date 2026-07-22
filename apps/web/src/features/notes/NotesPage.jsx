import Bold from 'lucide-react/dist/esm/icons/bold.mjs'
import Code from 'lucide-react/dist/esm/icons/code.mjs'
import Eye from 'lucide-react/dist/esm/icons/eye.mjs'
import Heading1 from 'lucide-react/dist/esm/icons/heading-1.mjs'
import Heading2 from 'lucide-react/dist/esm/icons/heading-2.mjs'
import Italic from 'lucide-react/dist/esm/icons/italic.mjs'
import List from 'lucide-react/dist/esm/icons/list.mjs'
import PenLine from 'lucide-react/dist/esm/icons/pen-line.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import Search from 'lucide-react/dist/esm/icons/search.mjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'

import { Avatar } from '../../components/ui/Avatar.jsx'
import { formatShortDate, todayIso } from '../../lib/format.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import { MarkdownPreview } from './MarkdownPreview.jsx'
import { NoteTemplateModal } from './NoteTemplateModal.jsx'
import styles from './NotesPage.module.css'

const toolbar = [
  { label: '제목 1', icon: Heading1, before: '\n# ' },
  { label: '제목 2', icon: Heading2, before: '\n## ' },
  { label: '굵게', icon: Bold, before: '**', after: '**' },
  { label: '기울기', icon: Italic, before: '*', after: '*' },
  { label: '목록', icon: List, before: '\n- ' },
  { label: '코드', icon: Code, before: '`', after: '`' },
]

export function NotesPage() {
  const { project } = useOutletContext()
  const { state, actions, capabilities } = useTeamFlow()
  const canEdit = capabilities.notes
  const [searchParams, setSearchParams] = useSearchParams()
  const projectNotes = useMemo(() => state.notes.filter((note) => note.projectId === project.id), [state.notes, project.id])
  const requestedNoteId = searchParams.get('note')
  const [activeId, setActiveId] = useState(projectNotes.some((note) => note.id === requestedNoteId) ? requestedNoteId : (projectNotes[0]?.id ?? null))
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const saveTimer = useRef(null)
  const textareaRef = useRef(null)
  const activeNote = state.notes.find((note) => note.id === activeId) ?? null

  useEffect(() => {
    if (requestedNoteId && projectNotes.some((note) => note.id === requestedNoteId)) {
      if (activeId !== requestedNoteId) setActiveId(requestedNoteId)
      return
    }
    if (!projectNotes.some((note) => note.id === activeId)) setActiveId(projectNotes[0]?.id ?? null)
  }, [projectNotes, activeId, requestedNoteId])

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const filtered = projectNotes.filter((note) => `${note.title} ${note.content}`.toLocaleLowerCase('ko-KR').includes(query.toLocaleLowerCase('ko-KR')))

  async function update(patch) {
    if (!activeNote) return
    clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    await actions.updateNote(activeNote.id, { ...patch, updatedAt: todayIso() })
    saveTimer.current = setTimeout(() => setSaveStatus('saved'), 900)
  }

  async function addTemplate(template) {
    const note = await actions.createNote(project.id, { title: template.title, content: template.content, updatedAt: todayIso(), authorId: state.currentUserId })
    setActiveId(note.id)
    setSearchParams({ note: note.id }, { replace: true })
    setPreview(false)
    setShowTemplates(false)
  }

  function insert(before, after = '') {
    const textarea = textareaRef.current
    if (!textarea || !activeNote) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = activeNote.content.slice(start, end)
    update({ content: `${activeNote.content.slice(0, start)}${before}${selected}${after}${activeNote.content.slice(end)}` })
    requestAnimationFrame(() => { textarea.focus(); textarea.selectionStart = start + before.length; textarea.selectionEnd = start + before.length + selected.length })
  }

  return (
    <section className={styles.notesPage} aria-label="공유 노트">
      <aside className={styles.noteList}>
        <header><div><h1>공유 노트</h1>{canEdit ? <button type="button" onClick={() => setShowTemplates(true)} aria-label="새 노트 만들기"><Plus size={16} /></button> : null}</div><label><Search size={13} /><span className="visually-hidden">노트 검색</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="노트 검색" /></label></header>
        <div className={styles.noteItems}>{filtered.map((note) => { const author = state.members.find((member) => member.id === note.authorId); const snippet = note.content.split('\n').find((line) => line.trim() && !/^[#>*-]/.test(line))?.replace(/[*`]/g, '') ?? ''; return <button type="button" className={note.id === activeId ? styles.activeNote : ''} key={note.id} onClick={() => { setActiveId(note.id); setSearchParams({ note: note.id }, { replace: true }); setPreview(false) }}><strong>{note.title || '제목 없음'}</strong><span>{author ? <Avatar member={author} /> : null}<em>{formatShortDate(note.updatedAt)}</em><small>{snippet}</small></span></button> })}{filtered.length === 0 ? <p>검색 결과가 없습니다.</p> : null}</div>
      </aside>
      <main className={styles.editorPane}>
        {activeNote ? <><div className={styles.toolbar}>{canEdit ? (preview ? <span className={styles.previewTag}>미리보기</span> : <div>{toolbar.map(({ label, icon: Icon, before, after }) => <button type="button" key={label} title={label} aria-label={label} onClick={() => insert(before, after)}><Icon size={15} /></button>)}</div>) : <span className={styles.previewTag}>읽기 전용 데모</span>}<div>{canEdit && saveStatus ? <span className={saveStatus === 'saved' ? styles.saved : ''}>{saveStatus === 'saved' ? '저장됨' : '저장 중…'}</span> : null}{canEdit ? <button type="button" onClick={() => setPreview((value) => !value)}>{preview ? <PenLine size={14} /> : <Eye size={14} />}{preview ? '편집으로 돌아가기' : '미리보기'}</button> : null}</div></div><div className={styles.editorScroll}><article className={styles.noteDocument}><header>{preview || !canEdit ? <h1>{activeNote.title || '제목 없음'}</h1> : <input value={activeNote.title} onChange={(event) => update({ title: event.target.value })} placeholder="제목 없음" />}<span>{(() => { const author = state.members.find((member) => member.id === activeNote.authorId); return author ? <Avatar member={author} /> : null })()}<em>{formatShortDate(activeNote.updatedAt)}</em></span></header><div className={styles.documentBody}>{preview || !canEdit ? <MarkdownPreview content={activeNote.content} /> : <textarea ref={textareaRef} value={activeNote.content} onChange={(event) => update({ content: event.target.value })} placeholder="# 제목&#10;&#10;내용을 자유롭게 입력하세요." />}</div></article></div></> : <div className={styles.noNote}><p>{canEdit ? '노트를 선택하거나 새로 만드세요' : '공유 노트 저장 기능은 다음 단계에서 제공됩니다.'}</p>{canEdit ? <button type="button" onClick={() => setShowTemplates(true)}><Plus size={15} />새 노트</button> : null}</div>}
      </main>
      {showTemplates && canEdit ? <NoteTemplateModal onSelect={addTemplate} onClose={() => setShowTemplates(false)} /> : null}
    </section>
  )
}
