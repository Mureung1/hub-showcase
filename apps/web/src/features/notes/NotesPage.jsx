import AlertCircle from 'lucide-react/dist/esm/icons/circle-alert.mjs'
import Bold from 'lucide-react/dist/esm/icons/bold.mjs'
import Code from 'lucide-react/dist/esm/icons/code.mjs'
import Eye from 'lucide-react/dist/esm/icons/eye.mjs'
import Heading1 from 'lucide-react/dist/esm/icons/heading-1.mjs'
import Heading2 from 'lucide-react/dist/esm/icons/heading-2.mjs'
import Italic from 'lucide-react/dist/esm/icons/italic.mjs'
import List from 'lucide-react/dist/esm/icons/list.mjs'
import PenLine from 'lucide-react/dist/esm/icons/pen-line.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw.mjs'
import Search from 'lucide-react/dist/esm/icons/search.mjs'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.mjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'

import { Avatar } from '../../components/ui/Avatar.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
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

const SAVE_DELAY_MS = 800
const NOTE_SORT = Object.freeze({
  UPDATED: 'updated',
  CREATED: 'created',
  TITLE: 'title',
})

function sortNotes(notes, sortMode) {
  return notes.map((note, index) => ({ note, index })).sort((left, right) => {
    let comparison
    if (sortMode === NOTE_SORT.TITLE) {
      comparison = String(left.note.title ?? '').localeCompare(String(right.note.title ?? ''), 'ko-KR')
    } else {
      const field = sortMode === NOTE_SORT.CREATED ? 'createdAt' : 'updatedAt'
      const leftValue = String(left.note[field] ?? left.note.updatedAt ?? '')
      const rightValue = String(right.note[field] ?? right.note.updatedAt ?? '')
      comparison = rightValue.localeCompare(leftValue)
    }
    return comparison || left.index - right.index
  }).map(({ note }) => note)
}

function toDraft(note) {
  return note ? { noteId: note.id, title: note.title ?? '', content: note.content ?? '' } : null
}

function draftsMatch(left, right) {
  return Boolean(left && right && left.noteId === right.noteId && left.title === right.title && left.content === right.content)
}

export function NotesPage() {
  const { project } = useOutletContext()
  const { state, actions, capabilities } = useTeamFlow()
  const { createNote, updateNote, deleteNote, registerBeforeLeave, reloadOnEntry } = actions
  const canEdit = capabilities.notes
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sortMode, setSortMode] = useState(NOTE_SORT.UPDATED)
  const projectNotes = useMemo(() => sortNotes(
    state.notes.filter((note) => note.projectId === project.id),
    sortMode,
  ), [state.notes, project.id, sortMode])
  const requestedNoteId = searchParams.get('note')
  const initialNote = projectNotes.find((note) => note.id === requestedNoteId) ?? projectNotes[0] ?? null
  const [activeId, setActiveId] = useState(initialNote?.id ?? null)
  const [draft, setDraft] = useState(() => toDraft(initialNote))
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState(Boolean(initialNote))
  const [showTemplates, setShowTemplates] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [saveError, setSaveError] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const textareaRef = useRef(null)
  const saveTimerRef = useRef(null)
  const draftRef = useRef(draft)
  const persistedRef = useRef(toDraft(initialNote))
  const dirtyRef = useRef(false)
  const savingPromiseRef = useRef(null)
  const flushSaveRef = useRef(async () => true)
  const activeNote = state.notes.find((note) => note.id === activeId) ?? null
  const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => (
    canEdit
    && dirtyRef.current
    && `${currentLocation.pathname}${currentLocation.search}${currentLocation.hash}`
      !== `${nextLocation.pathname}${nextLocation.search}${nextLocation.hash}`
  ))

  function setLoadedNote(note) {
    const nextDraft = toDraft(note)
    clearTimeout(saveTimerRef.current)
    draftRef.current = nextDraft
    persistedRef.current = nextDraft
    dirtyRef.current = false
    setDraft(nextDraft)
    setSaveStatus('idle')
    setSaveError('')
  }

  async function flushSave() {
    clearTimeout(saveTimerRef.current)
    if (!canEdit || !dirtyRef.current || !draftRef.current) return true

    if (savingPromiseRef.current) {
      const previousSaved = await savingPromiseRef.current
      if (!previousSaved) return false
      return dirtyRef.current ? flushSave() : true
    }

    const snapshot = { ...draftRef.current }
    setSaveStatus('saving')
    setSaveError('')

    const request = updateNote(snapshot.noteId, {
      title: snapshot.title,
      content: snapshot.content,
    }).then(() => {
      persistedRef.current = snapshot
      const stillDirty = !draftsMatch(draftRef.current, snapshot)
      dirtyRef.current = stillDirty
      setSaveStatus(stillDirty ? 'idle' : 'saved')
      return true
    }).catch((error) => {
      dirtyRef.current = true
      setSaveStatus('failed')
      setSaveError(error instanceof Error ? error.message : '노트를 저장하지 못했습니다.')
      return false
    }).finally(() => {
      savingPromiseRef.current = null
    })

    savingPromiseRef.current = request
    return request
  }

  flushSaveRef.current = flushSave

  useEffect(() => registerBeforeLeave(() => flushSaveRef.current()), [registerBeforeLeave])

  useEffect(() => {
    if (navigationBlocker.state !== 'blocked') return undefined
    let active = true
    void flushSaveRef.current().then((saved) => {
      if (!active) return
      if (saved) navigationBlocker.proceed()
      else navigationBlocker.reset()
    })
    return () => { active = false }
  }, [navigationBlocker])

  useEffect(() => {
    if (canEdit) void reloadOnEntry().catch(() => {})
  }, [canEdit, project.id, reloadOnEntry])

  function scheduleSave() {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void flushSaveRef.current()
    }, SAVE_DELAY_MS)
  }

  function changeDraft(patch) {
    if (!draftRef.current) return
    const nextDraft = { ...draftRef.current, ...patch }
    draftRef.current = nextDraft
    dirtyRef.current = !draftsMatch(nextDraft, persistedRef.current)
    setDraft(nextDraft)
    setSaveStatus(dirtyRef.current ? 'idle' : 'saved')
    setSaveError('')
    if (dirtyRef.current) scheduleSave()
    else clearTimeout(saveTimerRef.current)
  }

  async function selectNote(noteId) {
    if (noteId === activeId) return
    if (!(await flushSaveRef.current())) return
    const note = projectNotes.find((item) => item.id === noteId)
    if (!note) return
    setActiveId(noteId)
    setLoadedNote(note)
    setSearchParams({ note: noteId }, { replace: true })
    setPreview(true)
  }

  useEffect(() => {
    if (activeId && projectNotes.some((note) => note.id === activeId)) return
    const fallback = projectNotes.find((note) => note.id === requestedNoteId) ?? projectNotes[0] ?? null
    setActiveId(fallback?.id ?? null)
    setLoadedNote(fallback)
    setPreview(Boolean(fallback))
  }, [activeId, projectNotes, requestedNoteId])

  useEffect(() => {
    function beforeUnload(event) {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])

  useEffect(() => {
    function interceptInternalLink(event) {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const destination = new URL(anchor.href, window.location.href)
      if (destination.origin !== window.location.origin) return

      event.preventDefault()
      event.stopPropagation()
      void flushSaveRef.current().then((saved) => {
        if (saved) navigate(`${destination.pathname}${destination.search}${destination.hash}`)
      })
    }

    document.addEventListener('click', interceptInternalLink, true)
    return () => document.removeEventListener('click', interceptInternalLink, true)
  }, [navigate])

  useEffect(() => () => {
    clearTimeout(saveTimerRef.current)
    if (!dirtyRef.current || !draftRef.current || !canEdit) return
    const pending = draftRef.current
    void updateNote(pending.noteId, { title: pending.title, content: pending.content }).catch(() => {})
  }, [updateNote, canEdit])

  const filtered = projectNotes.filter((note) => {
    const visibleNote = note.id === activeId && draft ? { ...note, ...draft } : note
    return `${visibleNote.title} ${visibleNote.content}`.toLocaleLowerCase('ko-KR').includes(query.toLocaleLowerCase('ko-KR'))
  })

  async function addTemplate(template) {
    if (!(await flushSaveRef.current())) return
    setCreating(true)
    setCreateError('')
    try {
      const note = await createNote(project.id, {
        title: template.title,
        content: template.content,
        authorId: state.currentUserId,
        updatedAt: todayIso(),
      })
      setActiveId(note.id)
      setLoadedNote(note)
      setSearchParams({ note: note.id }, { replace: true })
      // A freshly-created note should be ready for typing immediately.
      setPreview(false)
      setShowTemplates(false)
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : '노트를 만들지 못했습니다.')
    } finally {
      setCreating(false)
    }
  }

  async function deleteActiveNote() {
    if (!activeNote) return
    clearTimeout(saveTimerRef.current)
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteNote(activeNote.id)
      const fallback = projectNotes.find((note) => note.id !== activeNote.id) ?? null
      setActiveId(fallback?.id ?? null)
      setLoadedNote(fallback)
      setSearchParams(fallback ? { note: fallback.id } : {}, { replace: true })
      setShowDelete(false)
      setPreview(Boolean(fallback))
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : '노트를 삭제하지 못했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  function insert(before, after = '') {
    const textarea = textareaRef.current
    if (!textarea || !draft) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = draft.content.slice(start, end)
    changeDraft({ content: `${draft.content.slice(0, start)}${before}${selected}${after}${draft.content.slice(end)}` })
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.selectionStart = start + before.length
      textarea.selectionEnd = start + before.length + selected.length
    })
  }

  const displayedTitle = draft?.title ?? activeNote?.title ?? ''
  const displayedContent = draft?.content ?? activeNote?.content ?? ''
  const author = activeNote ? state.members.find((member) => member.id === activeNote.authorId) : null

  return (
    <section className={styles.notesPage} aria-label="공유 노트">
      <aside className={styles.noteList} aria-label="노트 목록">
        <header>
          <div><h1>공유 노트</h1>{canEdit ? <button type="button" onClick={() => { setCreateError(''); setShowTemplates(true) }} aria-label="새 노트 만들기"><Plus size={16} /></button> : null}</div>
          <div className={styles.listControls}>
            <label className={styles.noteSearch}><Search size={13} /><span className="visually-hidden">노트 검색</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="노트 검색" /></label>
            <label className={styles.noteSort}>
              <span className="visually-hidden">노트 정렬</span>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} aria-label="노트 정렬">
                <option value={NOTE_SORT.UPDATED}>최근 수정순</option>
                <option value={NOTE_SORT.CREATED}>최근 생성순</option>
                <option value={NOTE_SORT.TITLE}>제목순</option>
              </select>
            </label>
          </div>
        </header>
        <div className={styles.noteItems}>
          {filtered.map((note) => {
            const visibleNote = note.id === activeId && draft ? { ...note, ...draft } : note
            const noteAuthor = state.members.find((member) => member.id === note.authorId)
            const snippet = visibleNote.content.split('\n').find((line) => line.trim() && !/^[#>*-]/.test(line))?.replace(/[*`]/g, '') ?? ''
            return <button type="button" className={note.id === activeId ? styles.activeNote : ''} key={note.id} onClick={() => void selectNote(note.id)}><strong>{visibleNote.title || '제목 없음'}</strong><span>{noteAuthor ? <Avatar member={noteAuthor} /> : <span className={styles.departedAuthor}>탈퇴한 사용자</span>}<em>{formatShortDate(note.updatedAt)}</em><small>{snippet}</small></span></button>
          })}
          {filtered.length === 0 ? <p>검색 결과가 없습니다.</p> : null}
        </div>
      </aside>

      <main className={styles.editorPane}>
        {activeNote && draft ? (
          <>
            <div className={styles.toolbar}>
              {canEdit ? (preview ? <span className={styles.previewTag}>미리보기</span> : <div>{toolbar.map(({ label, icon: Icon, before, after }) => <button type="button" key={label} title={label} aria-label={label} onClick={() => insert(before, after)}><Icon size={15} /></button>)}</div>) : <span className={styles.previewTag}>읽기 전용 데모</span>}
              <div className={styles.toolbarActions}>
                {canEdit && saveStatus === 'saving' ? <span role="status">저장 중…</span> : null}
                {canEdit && saveStatus === 'saved' ? <span className={styles.saved}>저장됨</span> : null}
                {canEdit && saveStatus === 'failed' ? <span className={styles.saveFailure} role="alert"><AlertCircle size={13} />{saveError}<button type="button" onClick={() => void flushSaveRef.current()}><RefreshCw size={12} />재시도</button></span> : null}
                {canEdit ? <button type="button" className={styles.deleteNoteButton} onClick={() => { setDeleteError(''); setShowDelete(true) }} aria-label="노트 삭제"><Trash2 size={14} /></button> : null}
                {canEdit ? <button type="button" onClick={() => setPreview((value) => !value)}>{preview ? <PenLine size={14} /> : <Eye size={14} />}{preview ? '편집으로 돌아가기' : '미리보기'}</button> : null}
              </div>
            </div>
            <div className={styles.editorScroll}>
              <article className={styles.noteDocument}>
                <header>
                  {preview || !canEdit ? <h1>{displayedTitle || '제목 없음'}</h1> : <input value={displayedTitle} onChange={(event) => changeDraft({ title: event.target.value })} placeholder="제목 없음" />}
                  <span>{author ? <Avatar member={author} /> : <span className={styles.departedAuthor}>탈퇴한 사용자</span>}<em>{formatShortDate(activeNote.updatedAt)}</em></span>
                </header>
                <div className={styles.documentBody}>{preview || !canEdit ? <MarkdownPreview content={displayedContent} /> : <textarea ref={textareaRef} value={displayedContent} onChange={(event) => changeDraft({ content: event.target.value })} placeholder="# 제목&#10;&#10;내용을 자유롭게 입력하세요." />}</div>
              </article>
            </div>
          </>
        ) : (
          <div className={styles.noNote}><p>{canEdit ? '노트를 선택하거나 새로 만드세요' : '등록된 공유 노트가 없습니다.'}</p>{canEdit ? <button type="button" onClick={() => { setCreateError(''); setShowTemplates(true) }}><Plus size={15} />새 노트</button> : null}</div>
        )}
      </main>

      {showTemplates && canEdit ? <NoteTemplateModal onSelect={addTemplate} onClose={() => !creating && setShowTemplates(false)} busy={creating} error={createError} /> : null}
      {showDelete && activeNote && canEdit ? (
        <Modal title="노트 삭제" width={400} onClose={() => !deleting && setShowDelete(false)} footer={<><button type="button" className={styles.cancelButton} onClick={() => setShowDelete(false)} disabled={deleting}>취소</button><button type="button" className={styles.dangerButton} onClick={() => void deleteActiveNote()} disabled={deleting}>{deleting ? '삭제 중…' : '삭제'}</button></>}>
          <div className={styles.deleteConfirm}><p><strong>{displayedTitle || '제목 없음'}</strong> 노트를 삭제할까요?</p><span>삭제한 노트는 복구할 수 없습니다.</span>{deleteError ? <small role="alert">{deleteError}</small> : null}</div>
        </Modal>
      ) : null}
    </section>
  )
}
