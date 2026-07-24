import { useState } from 'react'
import type { Interest, ReplaceUserInterestsResponse } from '../api/types'
import ContentLoadingScreen from '../components/ContentLoadingScreen'
import './InterestSelect.css'

// 한 번에 고를 수 있는 관심사 개수.
const MAX_SELECTION = 3

// 처음에 보여줄 관심사 개수. displayOrder가 이 순번을 나눈다.
const INITIAL_VISIBLE_COUNT = 11

type InterestSelectProps = {
  interests: Interest[]
  initialSelectedIds: string[]
  onSave: (interestIds: string[]) => Promise<ReplaceUserInterestsResponse>
  // 저장이 끝나면 부모(App)에게 알린다. 다음 화면으로 넘기는 것은 부모가 결정한다.
  onComplete: () => void
}

type SaveState = 'idle' | 'saving' | 'error'

export default function InterestSelect({
  interests,
  initialSelectedIds,
  onSave,
  onComplete,
}: InterestSelectProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)
  const [showAll, setShowAll] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  // 아래 값들은 state가 아니다. 위 두 개에서 계산할 수 있다.
  const visibleInterests = showAll
    ? interests
    : interests.slice(0, INITIAL_VISIBLE_COUNT)

  const selectedCount = selectedIds.length
  const isLimitReached = selectedCount >= MAX_SELECTION
  const hasSelection = selectedCount > 0
  const isSaving = saveState === 'saving'
  const hiddenCount = interests.length - INITIAL_VISIBLE_COUNT

  function toggleInterest(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((selectedId) => selectedId !== id)
      }
      if (prev.length >= MAX_SELECTION) {
        return prev // 3개를 채웠으면 더 고를 수 없다
      }
      return [...prev, id]
    })
  }

  async function handleSubmit() {
    setSaveState('saving')
    try {
      await onSave(selectedIds)
      onComplete()
    } catch {
      setSaveState('error')
    }
  }

  if (isSaving) {
    return (
      <ContentLoadingScreen
        message="관심사에 맞는 오늘의 글을 고르고 있어요"
        description="잠시만요, 곧 준비돼요"
      />
    )
  }

  return (
    <div className="app-shell">
      <header className="screen-header" />

      <main className="screen-main">
        <MascotIcon />

        <p className="onboarding-eyebrow">깸 시작하기</p>
        <h2 className="onboarding-title">
          관심 있는 주제를
          <br />
          골라주세요
        </h2>
        <p className="onboarding-desc">
          고른 주제 위에서 매일 글 하나와 짧은 사고 미션을 받게 돼요. 언제든
          설정에서 바꿀 수 있어요.
        </p>

        <p className="onboarding-limit">
          {selectedCount} / {MAX_SELECTION} 선택
          {isLimitReached && ' · 더 고르려면 하나를 해제하세요'}
        </p>

        <div className="tag-grid">
          {visibleInterests.map((interest) => {
            const isSelected = selectedIds.includes(interest.id)

            return (
              <button
                key={interest.id}
                type="button"
                className={`tag${isSelected ? ' tag--selected' : ''}`}
                aria-pressed={isSelected}
                disabled={!isSelected && isLimitReached}
                onClick={() => toggleInterest(interest.id)}
              >
                {isSelected && <CheckIcon />}
                {interest.name}
              </button>
            )
          })}
        </div>

        {!showAll && hiddenCount > 0 && (
          <button
            type="button"
            className="more-button"
            onClick={() => setShowAll(true)}
          >
            더보기 ({hiddenCount}개)
          </button>
        )}
      </main>

      <footer className="screen-footer">
        {saveState === 'error' && (
          <p role="alert" className="onboarding-error">
            저장에 실패했어요. 다시 시도해 주세요.
          </p>
        )}
        <button
          type="button"
          className="btn-primary"
          disabled={!hasSelection || isSaving}
          onClick={handleSubmit}
        >
          {hasSelection
            ? `${selectedCount}개 선택 · 깸 시작하기`
            : '관심사를 골라주세요'}
        </button>
      </footer>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 8.5l3 3 7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MascotIcon() {
  return (
    <svg
      className="onboarding-mascot"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 46l-3 8M44 46l3 8"
        stroke="var(--ink)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M18 26q-8-3-10-11M46 26q8-3 10-11"
        stroke="var(--ink)"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="14" y="14" width="36" height="34" rx="10" fill="currentColor" />
      <circle cx="25" cy="30" r="2.4" fill="var(--ink)" />
      <circle cx="39" cy="30" r="2.4" fill="var(--ink)" />
      <path
        d="M24 37q8 6 16 0"
        stroke="var(--ink)"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
