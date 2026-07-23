import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { shouldUseServerApi } from '../../app/icuApiMode'
import {
  useMistakeNoteStore,
  type MistakeNote,
  type MistakeNoteStatus,
} from './model/useMistakeNoteStore'
import { deleteMistakeNote, getMistakeNotes, updateMistakeNoteStatus } from './api/mistakeNoteClient'
import styles from './MistakeNotesPage.module.css'
import { createMistakeReviewPath, getMistakeNoteSourceLabel } from './mistakeNoteRoutes'
type MistakeFilter = 'all' | MistakeNoteStatus

const filterLabels: Record<MistakeFilter, string> = {
  all: '전체',
  open: '미해결',
  resolved: '해결',
}


export default function MistakeNotesPage() {
  const notes = useMistakeNoteStore((state) => state.notes)
  const hydrateMistakeNotes = useMistakeNoteStore((state) => state.hydrateMistakeNotes)
  const upsertMistakeNote = useMistakeNoteStore((state) => state.upsertMistakeNote)
  const markResolved = useMistakeNoteStore((state) => state.markResolved)
  const reopenMistake = useMistakeNoteStore((state) => state.reopenMistake)
  const removeMistake = useMistakeNoteStore((state) => state.removeMistake)
  const [filter, setFilter] = useState<MistakeFilter>('all')

  const sortedNotes = useMemo(() => sortMistakeNotes(notes), [notes])
  const filteredNotes = useMemo(
    () => sortedNotes.filter((note) => filter === 'all' || note.status === filter),
    [filter, sortedNotes],
  )
  const openCount = notes.filter((note) => note.status === 'open').length
  const resolvedCount = notes.filter((note) => note.status === 'resolved').length

  useEffect(() => {
    let cancelled = false

    if (shouldUseServerApi()) {
      void getMistakeNotes()
        .then(({ notes: serverNotes }) => {
          if (!cancelled) {
            hydrateMistakeNotes(serverNotes)
          }
        })
        .catch(() => {
          // Keep local mistake notes available when the backend is not running.
        })
    }

    return () => {
      cancelled = true
    }
  }, [hydrateMistakeNotes])

  function handleStatusChange(note: MistakeNote, status: MistakeNoteStatus) {
    if (status === 'resolved') {
      markResolved(note.id)
    } else {
      reopenMistake(note.id)
    }

    if (!shouldUseServerApi()) {
      return
    }

    void updateMistakeNoteStatus(note.id, status)
      .then(({ note: serverNote }) => upsertMistakeNote(serverNote))
      .catch(() => {
        // The optimistic local state remains available for mock-first learning.
      })
  }

  function handleRemoveMistake(id: string) {
    removeMistake(id)

    if (!shouldUseServerApi()) {
      return
    }

    void deleteMistakeNote(id).catch(() => {
      // The local removal already happened; the user can refresh after backend recovery.
    })
  }

  return (
    <main className={styles.page} aria-labelledby="mistake-notes-title">
      <header className={styles.header}>
        <div>
          <h1 id="mistake-notes-title">오답노트</h1>
          <p>틀린 명령과 다시 풀 레슨을 한 곳에서 관리합니다.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" disabled title="후속 기능">
            내보내기
          </button>
          <Link className={styles.addButton} to="/mistake-notes/new">
            + 새 오답 추가
          </Link>
        </div>
      </header>

      <section className={styles.panel} aria-label="오답 목록">
        <div className={styles.tabs} role="tablist" aria-label="오답노트 범위">
          <button className={styles.activeTab} type="button" role="tab" aria-selected="true">
            내가 저장한 오답
          </button>
          <button type="button" role="tab" aria-selected="false" disabled title="후속 기능">
            공유된 오답
          </button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.summary} aria-label="오답 요약">
            <span>전체 {notes.length}행</span>
            <span>미해결 {openCount}</span>
            <span>해결 {resolvedCount}</span>
          </div>
          <div className={styles.filters} aria-label="오답 상태 필터">
            {(Object.keys(filterLabels) as MistakeFilter[]).map((filterKey) => (
              <button
                className={filter === filterKey ? styles.activeFilter : undefined}
                key={filterKey}
                onClick={() => setFilter(filterKey)}
                type="button"
              >
                {filterLabels[filterKey]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>레슨</th>
                <th>출처</th>
                <th>실패 명령</th>
                <th>실패 이유</th>
                <th>수정 힌트</th>
                <th>저장 날짜</th>
                <th>최근 복습</th>
                <th>다시 풀기</th>
                <th>상태</th>
                <th>수정 및 삭제</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotes.map((note) => {
                const reviewPath = createMistakeReviewPath(note)

                return (
                  <tr key={note.id}>
                    <td>
                      <strong>{note.lessonTitle}</strong>
                      <span>{note.lessonId}</span>
                    </td>
                    <td>{getMistakeNoteSourceLabel(note.source)}</td>
                    <td>
                      <code>{note.command}</code>
                    </td>
                    <td title={note.reason}>{note.reason}</td>
                    <td title={note.correction}>{note.correction}</td>
                    <td>{formatDate(note.createdAt)}</td>
                    <td>{note.reviewedAt ? formatDate(note.reviewedAt) : '-'}</td>
                    <td>
                      <Link className={styles.actionButton} to={reviewPath}>
                        다시 풀기
                      </Link>
                    </td>
                    <td>
                      <span className={styles.statusBadge} data-status={note.status}>
                        {note.status === 'open' ? '미해결' : '해결'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        {note.status === 'open' ? (
                          <button type="button" onClick={() => handleStatusChange(note, 'resolved')}>
                            해결
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleStatusChange(note, 'open')}>
                            다시 열기
                          </button>
                        )}
                        <button
                          className={styles.deleteButton}
                          type="button"
                          onClick={() => handleRemoveMistake(note.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredNotes.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>표시할 오답이 없습니다.</strong>
              <p>Git Lab에서 실패한 명령을 오답노트에 추가하면 이곳에 표시됩니다.</p>
              <Link to="/git-lab">Git Lab으로 이동</Link>
            </div>
          ) : null}
        </div>

        <footer className={styles.pagination}>
          <span>전체 {filteredNotes.length} 행</span>
          <div aria-label="페이지네이션">
            <button type="button" disabled>
              &lt;
            </button>
            <strong>1 / 1</strong>
            <button type="button" disabled>
              &gt;
            </button>
          </div>
        </footer>
      </section>
    </main>
  )
}

function sortMistakeNotes(notes: MistakeNote[]) {
  return [...notes].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === 'open' ? -1 : 1
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}
