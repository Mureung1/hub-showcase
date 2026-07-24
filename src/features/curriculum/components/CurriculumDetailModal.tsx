import { useEffect, useRef } from 'react'
import type { GeneratedCurriculumSnapshot } from '../model/useGeneratedCurriculumStore'
import styles from './CurriculumDetailModal.module.css'

type CurriculumDetailModalProps = {
  snapshot: GeneratedCurriculumSnapshot | null
  originRect: DOMRect | null
  onClose: () => void
  onActivate: (snapshot: GeneratedCurriculumSnapshot) => void
  isActive: boolean
}

export function CurriculumDetailModal({
  snapshot,
  originRect,
  onClose,
  onActivate,
  isActive,
}: CurriculumDetailModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // ESC 키로 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!snapshot) return null

  const { plan, goal, generatedAt } = snapshot

  // 카드의 위치로부터 clip-path 시작값 계산
  const clipStyle = originRect
    ? ({
        '--from-top': `${originRect.top}px`,
        '--from-right': `${window.innerWidth - originRect.right}px`,
        '--from-bottom': `${window.innerHeight - originRect.bottom}px`,
        '--from-left': `${originRect.left}px`,
      } as React.CSSProperties)
    : {}

  return (
    <div
      ref={panelRef}
      className={styles.panel}
      style={clipStyle}
      role="dialog"
      aria-modal="true"
      aria-label={`${plan.title} 상세 보기`}
    >
      {/* 헤더 */}
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onClose}
          aria-label="목록으로 돌아가기"
        >
          ← 목록
        </button>
        <div className={styles.titleGroup}>
          <h2>{plan.title}</h2>
          <p>🎯 {goal}</p>
        </div>
        <button
          type="button"
          className={styles.activateButton}
          onClick={() => {
            onActivate(snapshot)
            onClose()
          }}
          disabled={isActive}
        >
          {isActive ? '학습 진행 중' : '이어서 학습하기'}
        </button>
      </header>

      {/* 바디 */}
      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={styles.tag}>예상 기간: {plan.estimatedDuration}</span>
          <span className={styles.tag}>권장 역할: {plan.focusRole}</span>
          <span className={styles.tag}>
            생성일: {new Date(generatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <div className={styles.summaryBox}>
          <strong>오늘 미션 ({plan.todayMission.fileName})</strong>
          <p>
            {plan.todayMission.title} · {plan.todayMission.detail} ({plan.todayMission.durationMinutes}분)
          </p>
        </div>

        <div>
          <h3 className={styles.sectionTitle}>학습 단계 목록</h3>
          <ol className={styles.stepList}>
            {plan.steps.map((step, index) => (
              <li key={step.id} className={styles.stepItem}>
                <span className={styles.stepNum}>{String(index + 1).padStart(2, '0')}</span>
                <div className={styles.stepContent}>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                  <small>{step.durationLabel} · {step.outcome}</small>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {plan.sources && plan.sources.length > 0 && (
          <div>
            <h3 className={styles.sectionTitle}>참고 공식 문서</h3>
            <div className={styles.sourcesList}>
              {plan.sources.map((source) => (
                <article key={source.title} className={styles.sourceCard}>
                  <strong>{source.title}</strong>
                  <span>{source.urlLabel}</span>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
