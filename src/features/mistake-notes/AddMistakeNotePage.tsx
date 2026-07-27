import { useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { shouldUseServerApi } from '../../app/icuApiMode'
import { createMistakeNote as createMistakeNoteApi } from './api/mistakeNoteClient'
import {
  mistakeNoteSources,
  useMistakeNoteStore,
  type MistakeNoteInput,
  type MistakeNoteSource,
} from './model/useMistakeNoteStore'
import { persistMistakeNote } from './model/persistMistakeNote'
import styles from './AddMistakeNotePage.module.css'

const sourceLabels: Record<MistakeNoteSource, string> = {
  'git-lab': 'Git Lab',
  workspace: '학습 워크스페이스',
  algorithm: '알고리즘 실습',
  'api-practice': 'API 실습',
}

const commandLabels: Record<MistakeNoteSource, string> = {
  'git-lab': '실패한 Git 명령어',
  workspace: '실패한 코드 / 실행 라벨',
  algorithm: '틀린 풀이 요약',
  'api-practice': '실패한 API 호출 / 코드',
}

const lessonIdPlaceholders: Record<MistakeNoteSource, string> = {
  'git-lab': '예: git-basics-3',
  workspace: '예: mission-02',
  algorithm: '예: bfs-level-1',
  'api-practice': '예: rest-crud-1',
}

const commandPlaceholders: Record<MistakeNoteSource, string> = {
  'git-lab': '예: git rebase main',
  workspace: '예: solution.py 실행 (런타임 에러)',
  algorithm: '예: BFS 탐색 — visited 배열 미초기화',
  'api-practice': '예: POST /users (401 Unauthorized)',
}

type FormState = {
  source: MistakeNoteSource
  lessonTitle: string
  lessonId: string
  command: string
  reason: string
  correction: string
}

const initialForm: FormState = {
  source: 'git-lab',
  lessonTitle: '',
  lessonId: '',
  command: '',
  reason: '',
  correction: '',
}

export default function AddMistakeNotePage() {
  const navigate = useNavigate()
  const addMistakeNote = useMistakeNoteStore((state) => state.addMistakeNote)
  const upsertMistakeNote = useMistakeNoteStore((state) => state.upsertMistakeNote)
  const hasOpenDuplicate = useMistakeNoteStore((state) => state.hasOpenDuplicate)

  const [form, setForm] = useState<FormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  function validate(): string | null {
    if (!form.lessonTitle.trim()) return '레슨 이름을 입력해 주세요.'
    if (!form.lessonId.trim()) return '레슨 ID를 입력해 주세요.'
    if (!form.command.trim()) return `${commandLabels[form.source]}을(를) 입력해 주세요.`
    if (!form.reason.trim()) return '실패 이유를 입력해 주세요.'
    if (!form.correction.trim()) return '수정 힌트를 입력해 주세요.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    const input: MistakeNoteInput = {
      source: form.source,
      lessonTitle: form.lessonTitle.trim(),
      lessonId: form.lessonId.trim(),
      command: form.command.trim(),
      reason: form.reason.trim(),
      correction: form.correction.trim(),
    }

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
        {/* 출처 카드 */}
        <section className={styles.card} aria-labelledby={`${formId}-source-heading`}>
          <h2 id={`${formId}-source-heading`} className={styles.cardTitle}>
            출처 학습 모듈
          </h2>
          <div className={styles.sourceGrid} role="group" aria-labelledby={`${formId}-source-heading`}>
            {mistakeNoteSources.map((src) => (
              <label
                key={src}
                className={`${styles.sourceOption} ${form.source === src ? styles.sourceSelected : ''}`}
              >
                <input
                  type="radio"
                  name="source"
                  value={src}
                  checked={form.source === src}
                  onChange={handleChange}
                  className={styles.srOnly}
                />
                <span className={styles.sourceLabel}>{sourceLabels[src]}</span>
              </label>
            ))}
          </div>
        </section>

        {/* 레슨 정보 카드 */}
        <section className={styles.card} aria-labelledby={`${formId}-lesson-heading`}>
          <h2 id={`${formId}-lesson-heading`} className={styles.cardTitle}>
            레슨 정보
          </h2>
          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label htmlFor={`${formId}-lessonTitle`}>
                레슨 이름 <span className={styles.required}>*</span>
              </label>
              <input
                ref={firstFieldRef}
                id={`${formId}-lessonTitle`}
                name="lessonTitle"
                type="text"
                value={form.lessonTitle}
                onChange={handleChange}
                placeholder="예: Git 브랜치 기초"
                autoComplete="off"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor={`${formId}-lessonId`}>
                레슨 ID <span className={styles.required}>*</span>
                <span className={styles.hint}> — 다시 풀기 이동에 사용</span>
              </label>
              <input
                id={`${formId}-lessonId`}
                name="lessonId"
                type="text"
                value={form.lessonId}
                onChange={handleChange}
                placeholder={lessonIdPlaceholders[form.source]}
                autoComplete="off"
              />
            </div>
          </div>
        </section>

        {/* 오답 내용 카드 */}
        <section className={styles.card} aria-labelledby={`${formId}-content-heading`}>
          <h2 id={`${formId}-content-heading`} className={styles.cardTitle}>
            오답 내용
          </h2>

          <div className={styles.fieldGroup}>
            <label htmlFor={`${formId}-command`}>
              {commandLabels[form.source]} <span className={styles.required}>*</span>
            </label>
            <textarea
              id={`${formId}-command`}
              name="command"
              value={form.command}
              onChange={handleChange}
              placeholder={commandPlaceholders[form.source]}
              rows={3}
              className={styles.mono}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label htmlFor={`${formId}-reason`}>
                실패 이유 <span className={styles.required}>*</span>
              </label>
              <textarea
                id={`${formId}-reason`}
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="예: 브랜치가 없는 상태에서 rebase 시도"
                rows={4}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor={`${formId}-correction`}>
                수정 힌트 <span className={styles.required}>*</span>
              </label>
              <textarea
                id={`${formId}-correction`}
                name="correction"
                value={form.correction}
                onChange={handleChange}
                placeholder="예: git branch feature 로 브랜치를 먼저 만들고 checkout"
                rows={4}
              />
            </div>
          </div>
        </section>

        {/* 중복 경고 */}
        {isDuplicate && (
          <p className={styles.duplicateWarning} role="alert">
            ⚠ 같은 출처·레슨·명령·이유의 미해결 오답이 이미 있습니다. 계속 추가하면
            중복이 저장됩니다.
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
