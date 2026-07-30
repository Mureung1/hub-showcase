import { useId, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { shouldUseServerApi } from '../../app/icuApiMode'
import { createMistakeNote as createMistakeNoteApi } from './api/mistakeNoteClient'
import { useMistakeNoteStore } from './model/useMistakeNoteStore'
import { persistMistakeNote } from './model/persistMistakeNote'
import {
  emptyMistakeNoteForm,
  normalizeMistakeNoteForm,
  validateMistakeNoteForm,
} from './model/mistakeNoteForm'
import { MistakeNoteFormFields } from './components/MistakeNoteFormFields'
import styles from './AddMistakeNotePage.module.css'

export default function AddMistakeNotePage() {
  const navigate = useNavigate()
  const addMistakeNote = useMistakeNoteStore((state) => state.addMistakeNote)
  const upsertMistakeNote = useMistakeNoteStore((state) => state.upsertMistakeNote)
  const hasOpenDuplicate = useMistakeNoteStore((state) => state.hasOpenDuplicate)

  const [form, setForm] = useState(emptyMistakeNoteForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formId = useId()

  const isDuplicate = useMemo(() => {
    if (!form.command || !form.reason || !form.lessonId) return false
    return hasOpenDuplicate({
      source: form.source,
      lessonId: form.lessonId,
      command: form.command,
      reason: form.reason,
    })
  }, [form.source, form.lessonId, form.command, form.reason, hasOpenDuplicate])

  function handleChange(nextForm: typeof form) {
    setForm(nextForm)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationError = validateMistakeNoteForm(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    const input = normalizeMistakeNoteForm(form)

    try {
      await persistMistakeNote(input, {
        serverMode: shouldUseServerApi(),
        createServer: createMistakeNoteApi,
        addLocal: addMistakeNote,
        upsert: upsertMistakeNote,
      })

      void navigate('/mistake-notes')
    } catch {
      setError('오답 추가에 실패했습니다. 다시 시도해 주세요.')
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page} aria-labelledby="add-mistake-title">
      {/* 상단 네비게이션 */}
      <nav className={styles.breadcrumb} aria-label="페이지 이동">
        <Link to="/mistake-notes">← 오답노트</Link>
        <span aria-hidden="true">/</span>
        <span>새 오답 추가</span>
      </nav>

      <header className={styles.header}>
        <h1 id="add-mistake-title">새 오답 추가</h1>
        <p>틀렸거나 헷갈린 내용을 기록해 두고 나중에 다시 풀어보세요.</p>
      </header>

      <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
        <MistakeNoteFormFields
          formId={formId}
          value={form}
          mode="edit"
          disabled={submitting}
          onChange={handleChange}
        />

        {/* 중복 경고 */}
        {isDuplicate && (
          <p className={styles.duplicateWarning} role="alert">
            ⚠ 같은 출처·레슨·명령·이유의 미해결 오답이 이미 있습니다. 계속 추가하면 중복이
            저장됩니다.
          </p>
        )}

        {/* 에러 */}
        {error && (
          <p className={styles.errorMessage} role="alert">
            {error}
          </p>
        )}

        {/* 하단 액션 */}
        <div className={styles.actions}>
          <Link to="/mistake-notes" className={styles.cancelLink}>
            취소
          </Link>
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? '추가 중…' : '오답 추가'}
          </button>
        </div>
      </form>
    </main>
  )
}
