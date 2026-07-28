import { mistakeNoteSources, type MistakeNoteInput } from '../model/useMistakeNoteStore'
import {
  commandLabels,
  commandPlaceholders,
  lessonIdPlaceholders,
  sourceLabels,
} from '../model/mistakeNoteForm'
import styles from './MistakeNoteFormFields.module.css'

type MistakeNoteFormFieldsProps = {
  formId: string
  value: MistakeNoteInput
  mode: 'read' | 'edit'
  disabled?: boolean
  onChange?: (next: MistakeNoteInput) => void
}

export function MistakeNoteFormFields({
  formId,
  value,
  mode,
  disabled = false,
  onChange,
}: MistakeNoteFormFieldsProps) {
  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value: nextValue } = event.target
    onChange?.({ ...value, [name]: nextValue })
  }

  return (
    <div className={styles.fields} data-mode={mode}>
      <section className={styles.card} aria-labelledby={`${formId}-source-heading`}>
        <h3 id={`${formId}-source-heading`} className={styles.cardTitle}>
          출처 학습 모듈
        </h3>
        <div
          className={styles.sourceGrid}
          role="group"
          aria-labelledby={`${formId}-source-heading`}
        >
          {mistakeNoteSources.map((source) => (
            <label
              key={source}
              className={`${styles.sourceOption} ${value.source === source ? styles.sourceSelected : ''}`}
            >
              <input
                type="radio"
                name="source"
                value={source}
                checked={value.source === source}
                onChange={handleChange}
                className={styles.srOnly}
                disabled={disabled || mode === 'read'}
              />
              <span className={styles.sourceLabel}>{sourceLabels[source]}</span>
            </label>
          ))}
        </div>
      </section>

      <section className={styles.card} aria-labelledby={`${formId}-lesson-heading`}>
        <h3 id={`${formId}-lesson-heading`} className={styles.cardTitle}>
          레슨 정보
        </h3>
        <div className={styles.row}>
          <Field label="레슨 이름" id={`${formId}-lessonTitle`} required>
            <input
              id={`${formId}-lessonTitle`}
              name="lessonTitle"
              type="text"
              value={value.lessonTitle}
              onChange={handleChange}
              placeholder="예: Git 브랜치 기초"
              autoComplete="off"
              disabled={disabled}
              readOnly={mode === 'read'}
            />
          </Field>
          <Field label="레슨 ID" hint=" — 다시 풀기 이동에 사용" id={`${formId}-lessonId`} required>
            <input
              id={`${formId}-lessonId`}
              name="lessonId"
              type="text"
              value={value.lessonId}
              onChange={handleChange}
              placeholder={lessonIdPlaceholders[value.source]}
              autoComplete="off"
              disabled={disabled}
              readOnly={mode === 'read'}
            />
          </Field>
        </div>
      </section>

      <section className={styles.card} aria-labelledby={`${formId}-content-heading`}>
        <h3 id={`${formId}-content-heading`} className={styles.cardTitle}>
          오답 내용
        </h3>
        <Field label={commandLabels[value.source]} id={`${formId}-command`} required>
          <textarea
            id={`${formId}-command`}
            name="command"
            value={value.command}
            onChange={handleChange}
            placeholder={commandPlaceholders[value.source]}
            rows={3}
            className={styles.mono}
            disabled={disabled}
            readOnly={mode === 'read'}
          />
        </Field>
        <div className={styles.row}>
          <Field label="실패 이유" id={`${formId}-reason`} required>
            <textarea
              id={`${formId}-reason`}
              name="reason"
              value={value.reason}
              onChange={handleChange}
              placeholder="예: 브랜치가 없는 상태에서 rebase 시도"
              rows={4}
              disabled={disabled}
              readOnly={mode === 'read'}
            />
          </Field>
          <Field label="수정 힌트" id={`${formId}-correction`} required>
            <textarea
              id={`${formId}-correction`}
              name="correction"
              value={value.correction}
              onChange={handleChange}
              placeholder="예: git branch feature 로 브랜치를 먼저 만들고 checkout"
              rows={4}
              disabled={disabled}
              readOnly={mode === 'read'}
            />
          </Field>
        </div>
      </section>
    </div>
  )
}

function Field({
  label,
  hint,
  id,
  required,
  children,
}: {
  label: string
  hint?: string
  id: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={id}>
        {label} {required ? <span className={styles.required}>*</span> : null}
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </label>
      {children}
    </div>
  )
}
