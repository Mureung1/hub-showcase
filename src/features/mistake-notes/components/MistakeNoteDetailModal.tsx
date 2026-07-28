import { useEffect } from 'react'
import { Link } from 'react-router'
import type { MistakeNote, MistakeNoteStatus } from '../model/useMistakeNoteStore'
import { createMistakeReviewPath, getMistakeNoteSourceLabel } from '../mistakeNoteRoutes'
import styles from './MistakeNoteDetailModal.module.css'

export type MistakeNoteDetailModalProps = {
  note: MistakeNote | null
  onClose: () => void
  onStatusChange: (note: MistakeNote, status: MistakeNoteStatus) => boolean | Promise<boolean>
  onDelete: (id: string) => boolean | Promise<boolean>
  isPending?: boolean
}

export function MistakeNoteDetailModal({
  note,
  onClose,
  onStatusChange,
  onDelete,
  isPending = false,
}: MistakeNoteDetailModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (note) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [note, onClose])

  if (!note) return null

  const reviewPath = createMistakeReviewPath(note)
  const formattedCreatedAt = formatDate(note.createdAt)
  const formattedReviewedAt = note.reviewedAt ? formatDate(note.reviewedAt) : '-'

  async function handleDelete() {
    if (!note) return
    if (confirm('이 오답 기록을 삭제하시겠습니까?')) {
      const deleted = await onDelete(note.id)
      if (deleted) onClose()
    }
  }

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mistake-detail-title"
    >
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
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <span className={styles.label}>실패 명령어 / 실행 내용</span>
            <pre className={styles.codeBlock}>
              <code>{note.command}</code>
            </pre>
          </section>

          <section className={styles.section}>
            <span className={styles.label}>실패 이유 / 원인</span>
            <div className={styles.textCard}>{note.reason}</div>
          </section>

          <section className={styles.section}>
            <span className={styles.label}>수정 힌트 / 정답 해설</span>
            <div className={`${styles.textCard} ${styles.correctionCard}`}>{note.correction}</div>
          </section>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>저장 일시</span>
              <span className={styles.metaValue}>{formattedCreatedAt}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>최근 복습 일시</span>
              <span className={styles.metaValue}>{formattedReviewedAt}</span>
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          <div className={styles.leftActions}>
            <Link className={styles.reviewButton} to={reviewPath} onClick={onClose}>
              다시 풀기
            </Link>
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
            <button type="button" className={styles.deleteButton} onClick={() => void handleDelete()} disabled={isPending}>
              삭제
            </button>
          </div>
          <div className={styles.rightActions}>
            <button type="button" className={styles.closeFooterButton} onClick={onClose}>
              닫기
            </button>
          </div>
        </footer>
      </div>
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
