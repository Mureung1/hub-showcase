import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { shouldUseServerApi } from '../../app/icuApiMode'
import {
  deleteCurriculumHistoryItemApi,
  getCurriculumHistory,
  saveGeneratedCurriculumApi,
} from './api/curriculumClient'
import { CurriculumDetailModal } from './components/CurriculumDetailModal'
import {
  useGeneratedCurriculumStore,
  type GeneratedCurriculumSnapshot,
} from './model/useGeneratedCurriculumStore'
import styles from './CurriculumHistoryPage.module.css'

export function CurriculumHistoryPage() {
  const navigate = useNavigate()
  const activeCurriculum = useGeneratedCurriculumStore((state) => state.generatedCurriculum)
  const history = useGeneratedCurriculumStore((state) => state.history)
  const hydrateHistory = useGeneratedCurriculumStore((state) => state.hydrateHistory)
  const hydrateGeneratedCurriculum = useGeneratedCurriculumStore(
    (state) => state.hydrateGeneratedCurriculum,
  )
  const activateCurriculumSnapshot = useGeneratedCurriculumStore(
    (state) => state.activateCurriculumSnapshot,
  )
  const deleteCurriculumSnapshot = useGeneratedCurriculumStore(
    (state) => state.deleteCurriculumSnapshot,
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [serverError, setServerError] = useState('')
  const [detailState, setDetailState] = useState<{
    snapshot: GeneratedCurriculumSnapshot
    rect: DOMRect | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    if (shouldUseServerApi()) {
      void getCurriculumHistory({ mode: 'server' })
        .then(({ curriculums }) => {
          if (!cancelled) {
            hydrateHistory(curriculums)
          }
        })
        .catch(() => {
          if (!cancelled) setServerError('커리큘럼 이력을 불러오지 못했습니다. 다시 열어 주세요.')
        })
    }

    return () => {
      cancelled = true
    }
  }, [hydrateHistory])

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return history

    return history.filter(
      (item) =>
        item.goal.toLowerCase().includes(query) ||
        item.plan.title.toLowerCase().includes(query) ||
        item.plan.summary.toLowerCase().includes(query),
    )
  }, [history, searchQuery])

  // Count duplicates by goal
  const duplicateGoalCount = useMemo(() => {
    const goalCounts = new Map<string, number>()
    for (const item of history) {
      const g = item.goal.trim().toLowerCase()
      goalCounts.set(g, (goalCounts.get(g) ?? 0) + 1)
    }

    let duplicates = 0
    for (const count of goalCounts.values()) {
      if (count > 1) {
        duplicates += count - 1
      }
    }
    return duplicates
  }, [history])

  async function handleActivate(snapshot: GeneratedCurriculumSnapshot) {
    const targetId = snapshot.id || `${snapshot.goal}-curriculum-plan`
    setServerError('')

    try {
      if (shouldUseServerApi()) {
        const { generatedCurriculum } = await saveGeneratedCurriculumApi(
          { ...snapshot, id: targetId, updatedAt: new Date().toISOString() },
          { mode: 'server' },
        )
        hydrateGeneratedCurriculum(generatedCurriculum)
      } else {
        activateCurriculumSnapshot(targetId)
      }
      void navigate('/today')
    } catch {
      setServerError('선택한 커리큘럼을 활성화하지 못했습니다. 다시 시도해 주세요.')
    }
  }

  async function handleDelete(snapshot: GeneratedCurriculumSnapshot) {
    const targetId = snapshot.id || `${snapshot.goal}-curriculum-plan`
    setServerError('')

    try {
      if (shouldUseServerApi()) {
        await deleteCurriculumHistoryItemApi(targetId, { mode: 'server' })
      }
      deleteCurriculumSnapshot(targetId)
    } catch {
      setServerError('커리큘럼을 삭제하지 못했습니다. 다시 시도해 주세요.')
    }
  }

  async function handleCleanDuplicates() {
    const seenGoals = new Set<string>()
    const cleaned: GeneratedCurriculumSnapshot[] = []
    const duplicateIds: string[] = []

    for (const item of history) {
      const normalizedGoal = item.goal.trim().toLowerCase()
      if (!seenGoals.has(normalizedGoal)) {
        seenGoals.add(normalizedGoal)
        cleaned.push(item)
      } else {
        const idToDelete = item.id || `${item.goal}-curriculum-plan`
        if (shouldUseServerApi()) duplicateIds.push(idToDelete)
      }
    }

    try {
      await Promise.all(duplicateIds.map((id) => deleteCurriculumHistoryItemApi(id, { mode: 'server' })))
      hydrateHistory(cleaned)
    } catch {
      setServerError('중복 커리큘럼을 정리하지 못했습니다. 다시 시도해 주세요.')
    }
  }

  const activeId = activeCurriculum?.id || (activeCurriculum ? `${activeCurriculum.goal}-curriculum-plan` : '')

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>커리큘럼 보관함</h1>
          <p>AI가 생성한 학습 커리큘럼 이력을 날짜별로 확인하고 이어서 학습을 진행합니다.</p>
        </div>
        <div className={styles.headerActions}>
          {duplicateGoalCount > 0 && (
            <button
              type="button"
              className={styles.cleanDuplicatesButton}
              onClick={handleCleanDuplicates}
            >
              중복 항목 정리 ({duplicateGoalCount}개)
            </button>
          )}
          <Link to="/today" className={styles.createLink}>
            + 새 커리큘럼 생성
          </Link>
        </div>
      </header>

      {serverError ? <p className={styles.errorMessage} role="alert">{serverError}</p> : null}

      <div className={styles.filterRow}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="목표 또는 제목으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className={styles.statsBar}>
          총 <strong>{filteredHistory.length}</strong>개의 커리큘럼 보관됨
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <section className={styles.emptyState}>
          <strong>보관된 커리큘럼이 없습니다.</strong>
          <p>Today Hub에서 학습 목표를 입력하고 코듀 AI 커리큘럼을 만들어보세요.</p>
          <Link to="/today" className={styles.createLink}>
            오늘 학습으로 이동
          </Link>
        </section>
      ) : (
        <div className={styles.grid}>
          {filteredHistory.map((item) => {
            const itemId = item.id || `${item.goal}-curriculum-plan`
            const isActive = activeId === itemId

            return (
              <article
                key={itemId}
                className={styles.card}
                data-active={isActive ? 'true' : 'false'}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.badgeGroup}>
                    {isActive ? (
                      <span className={styles.activeBadge}>현재 학습 중</span>
                    ) : (
                      <span className={styles.savedBadge}>보관됨</span>
                    )}
                  </div>
                  <time className={styles.dateLabel}>
                    {new Date(item.generatedAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>

                <p className={styles.goalLabel}>🎯 {item.goal}</p>
                <h2 className={styles.cardTitle}>{item.plan.title}</h2>
                <p className={styles.cardSummary}>{item.plan.summary}</p>

                <div className={styles.missionBox}>
                  <strong>오늘 미션: {item.plan.todayMission.title}</strong>
                  <span>{item.plan.todayMission.detail} ({item.plan.todayMission.durationMinutes}분)</span>
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.activateButton}
                    disabled={isActive}
                    onClick={() => handleActivate(item)}
                  >
                    {isActive ? '학습 진행 중' : '이어서 학습하기'}
                  </button>
                  <button
                    type="button"
                    className={styles.detailButton}
                    onClick={(e) => {
                      const rect =
                        (e.currentTarget as HTMLElement)
                          .closest('article')
                          ?.getBoundingClientRect() ?? null
                      setDetailState({ snapshot: item, rect })
                    }}
                  >
                    상세 보기
                  </button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(item)}
                    aria-label="삭제"
                  >
                    삭제
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {detailState && (
        <CurriculumDetailModal
          snapshot={detailState.snapshot}
          originRect={detailState.rect}
          onClose={() => setDetailState(null)}
          onActivate={handleActivate}
          isActive={
            (detailState.snapshot.id ||
              `${detailState.snapshot.goal}-curriculum-plan`) === activeId
          }
        />
      )}
    </div>
  )
}
