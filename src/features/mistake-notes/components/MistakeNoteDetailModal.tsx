import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import type { MistakeNote, MistakeNoteInput, MistakeNoteStatus } from '../model/useMistakeNoteStore'
import {
  normalizeMistakeNoteForm,
  toMistakeNoteForm,
  validateMistakeNoteForm,
} from '../model/mistakeNoteForm'
import { createMistakeReviewPath, getMistakeNoteSourceLabel } from '../mistakeNoteRoutes'
import { MistakeNoteFormFields } from './MistakeNoteFormFields'
import styles from './MistakeNoteDetailModal.module.css'

export type MistakeNoteDetailModalProps = {
  note: MistakeNote | null
  onClose: () => void
  onUpdate: (note: MistakeNote, input: MistakeNoteInput) => boolean | Promise<boolean>
  onStatusChange: (note: MistakeNote, status: MistakeNoteStatus) => boolean | Promise<boolean>
  onDelete: (id: string) => boolean | Promise<boolean>
  isPending?: boolean
}

export function MistakeNoteDetailModal({
  note,
  onClose,
  onUpdate,
  onStatusChange,
  onDelete,
  isPending = false,
}: MistakeNoteDetailModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const isLocked = isPending || isSaving

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isLocked) onClose()
    }

    if (note) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isLocked, note, onClose])

  if (!note) return null

  async function handleUpdate(currentNote: MistakeNote, input: MistakeNoteInput) {
    setIsSaving(true)
    try {
      return await onUpdate(currentNote, input)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isLocked) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mistake-detail-title"
      aria-busy={isLocked}
    >
      <MistakeNoteDetailContent
        key={note.id}
        note={note}
        onClose={onClose}
        onUpdate={handleUpdate}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        isPending={isLocked}
      />
    </div>
  )
}

function MistakeNoteDetailContent({
  note,
  onClose,
  onUpdate,
  onStatusChange,
  onDelete,
  isPending,
}: Required<Omit<MistakeNoteDetailModalProps, 'note'>> & { note: MistakeNote }) {
  const [mode, setMode] = useState<'read' | 'edit'>('read')
  const [draft, setDraft] = useState(() => toMistakeNoteForm(note))
  const [error, setError] = useState<string | null>(null)
  const formId = useId()
  const reviewPath = createMistakeReviewPath(note)

  function handleEdit() {
    setDraft(toMistakeNoteForm(note))
    setError(null)
    setMode('edit')
  }

  function handleCancel() {
    setDraft(toMistakeNoteForm(note))
    setError(null)
    setMode('read')
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (isPending) return

    const validationError = validateMistakeNoteForm(draft)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    try {
      const saved = await onUpdate(note, normalizeMistakeNoteForm(draft))
      if (saved) setMode('read')
      else setError('저장에 실패했습니다. 다시 시도해 주세요.')
    } catch {
      setError('저장에 실패했습니다. 다시 시도해 주세요.')
    }
  }

  async function handleDelete() {
    if (confirm('이 오답 기록을 삭제하시겠습니까?')) {
      const deleted = await onDelete(note.id)
      if (deleted) onClose()
    }
  }

  return (
    <div className={styles.modal}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.badges}>
            <span className={styles.sourceBadge}>{getMistakeNoteSourceLabel(note.source)}</span>
            <span className={styles.lessonIdBadge}>{note.lessonId}</span>
            <span className={styles.statusBadge} data-status={note.status}>
              {note.status === 'open' ? '미해결' : '해결'}
            </span>
          </div>
          <h2 id="mistake-detail-title" className={styles.title}>
            {note.lessonTitle}
          </h2>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="상세보기 닫기"
          disabled={isPending}
        >
          ×
        </button>
      </header>

      <form className={styles.form} onSubmit={(event) => void handleSave(event)} noValidate>
        <div className={styles.body}>
          <MistakeNoteFormFields
            formId={formId}
            value={mode === 'edit' ? draft : toMistakeNoteForm(note)}
            mode={mode}
            disabled={isPending}
            onChange={(nextDraft) => {
              setDraft(nextDraft)
              setError(null)
            }}
          />

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>저장 일시</span>
              <span className={styles.metaValue}>{formatDate(note.createdAt)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>최근 복습 일시</span>
              <span className={styles.metaValue}>
                {note.reviewedAt ? formatDate(note.reviewedAt) : '-'}
              </span>
            </div>
          </div>

          {error ? (
            <p className={styles.errorMessage} role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className={styles.footer}>
          {mode === 'read' ? (
            <>
              <div className={styles.leftActions}>
                <Link className={styles.reviewButton} to={reviewPath} onClick={onClose}>
                  다시 풀기
                </Link>
                <button type="button" className={styles.editButton} onClick={handleEdit}>
                  수정
                </button>
                {note.status === 'open' ? (
                  <button
                    type="button"
                    className={styles.statusToggle}
                    onClick={() => void onStatusChange(note, 'resolved')}
                    disabled={isPending}
                  >
                    해결로 표시
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.statusToggle}
                    onClick={() => void onStatusChange(note, 'open')}
                    disabled={isPending}
                  >
                    미해결로 되돌리기
                  </button>
                )}
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => void handleDelete()}
                  disabled={isPending}
                >
                  삭제
                </button>
              </div>
              <div className={styles.rightActions}>
                <button type="button" className={styles.closeFooterButton} onClick={onClose}>
                  닫기
                </button>
              </div>
            </>
          ) : (
            <div className={styles.editActions}>
              <button
                type="button"
                className={styles.closeFooterButton}
                onClick={handleCancel}
                disabled={isPending}
              >
                취소
              </button>
              <button type="submit" className={styles.saveButton} disabled={isPending}>
                {isPending ? '저장 중…' : '저장'}
              </button>
            </div>
          )}
        </footer>
      </form>
    </div>
  )
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}
