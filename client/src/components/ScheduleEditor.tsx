import { useState } from 'react'
import { useNavigate } from 'react-router'
import { slotKey, type ScheduleSlot, type SubmitResponseRequest } from 'shared'
import type { SubmitResult } from '../lib/useScheduleResponse.ts'
import { usePagedDateRange } from '../lib/usePagedDateRange.ts'
import ScheduleGrid from './ScheduleGrid.tsx'
import Modal from './Modal.tsx'
import DatePaginationArrows from './DatePaginationArrows.tsx'
import { useToast } from './ToastProvider.tsx'
import './ScheduleEditor.css'

type ScheduleEditorProps = {
  appointmentId: string
  candidateSlots: ScheduleSlot[]
  initialAvailable: ScheduleSlot[]
  initialPreferred: ScheduleSlot[]
  onSubmit: (body: SubmitResponseRequest) => Promise<SubmitResult>
}

// study: toggle 동작:존재할 시 delete, 없었을 시 add(리렌더를 위해 새로운 Set으로 반환.)
function toggleKey(keys: Set<string>, key: string): Set<string> {
  const next = new Set(keys)
  if (next.has(key)) { 
    next.delete(key)
  } else {
    next.add(key)
  }
  return next
}

function ScheduleEditor({ appointmentId, candidateSlots, initialAvailable, initialPreferred, onSubmit }: ScheduleEditorProps) {
  const navigate = useNavigate()
  const showToast = useToast()
  const [step, setStep] = useState<'available' | 'preferred'>('available')
  const [availableKeys, setAvailableKeys] = useState<Set<string>>(() => new Set(initialAvailable.map(slotKey)))
  const [preferredKeys, setPreferredKeys] = useState<Set<string>>(() => new Set(initialPreferred.map(slotKey)))
  const [confirmIntent, setConfirmIntent] = useState<'submit' | 'skip' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const { visibleDates, canGoPrev, canGoNext, goPrev, goNext } = usePagedDateRange(candidateSlots)
  // claude: 1단계/2단계 둘 다 같은 candidateSlots를 페이지네이션하므로 훅은 한 번만 호출하고, 그리드에 넘길 slots만 현재 페이지 날짜로 필터링한다.
  const pageSlots = candidateSlots.filter((slot) => visibleDates.includes(slot.date))

  const toggleAvailable = (slot: ScheduleSlot) => {
    const key = slotKey(slot)
    const isRemoving = availableKeys.has(key) // study: available에 이미 key가 있는 경우 = Remove 하는 경우.

    setAvailableKeys((prev) => toggleKey(prev, key)) // study: set 의 인자로 함수를 넘기는 경우. prev는 기존 state(여기선 availableKeys), key는 지금 toggle 반영할 새로운 slot.
    // claude: 가능한 시간을 해제하면 같은 슬롯을 선호 Set에서도 함께 제거 — 선호는 항상 가능의 부분집합이어야 하는 불변식을 FE에서도 유지.
    if (isRemoving) {
      setPreferredKeys((prev) => (prev.has(key) ? toggleKey(prev, key) : prev))
    }
  }

  const togglePreferred = (slot: ScheduleSlot) => {
    setPreferredKeys((prev) => toggleKey(prev, slotKey(slot)))
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setSubmitError('')

    const availableSlots = candidateSlots.filter((slot) => availableKeys.has(slotKey(slot))) // study: candidateSlots = 가능한 시간 range 안의 전체 slots.
    // claude: "건너뛰기"로 확정하면 선호 Set은 그대로 두고, 제출할 때만 빈 배열로 보낸다 — 클릭 즉시 Set을 비우면 모달의 "돌아가기"를 눌렀을 때 선택이 복구되지 않기 때문(확정된 설계 결정 참고).
    const preferredSlots = confirmIntent === 'skip' ? [] : candidateSlots.filter((slot) => preferredKeys.has(slotKey(slot)))

    const result = await onSubmit({ availableSlots, preferredSlots })
    setIsSubmitting(false)

    if (result.success) {
      navigate(`/a/${appointmentId}`)
      showToast('응답이 저장됐어요')
    } else {
      setSubmitError(result.error)
    }
  }

  if (step === 'preferred') {
    const preferredCount = confirmIntent === 'skip' ? 0 : preferredKeys.size
    // claude: 선호는 항상 가능의 부분집합이라(불변식), 가능 개수에서 선호 개수를 빼서 "선호 아닌 가능"만 따로 세면
    // 두 숫자가 서로 안 겹치고 합치면 실제 선택한 슬롯 총 개수가 되도록 보여줄 수 있다.
    const availableOnlyCount = availableKeys.size - preferredCount

    return (
      <div className="page-stack transition-slide-up">
        <h2>가능한 시간 중 특히 더 선호하는 시간대가 있으신가요?</h2>
        <div className="schedule-legend">
          <span className="schedule-legend__item">
            <span className="schedule-legend__swatch schedule-legend__swatch--preferred" />
            선호
          </span>
          <span className="schedule-legend__item">
            <span className="schedule-legend__swatch schedule-legend__swatch--available" />
            가능(선택)
          </span>
        </div>
        <DatePaginationArrows canGoPrev={canGoPrev} canGoNext={canGoNext} onPrev={goPrev} onNext={goNext} />
        <ScheduleGrid
          slots={pageSlots}
          eligibleKeys={availableKeys}
          selectedKeys={preferredKeys}
          variant="preferred"
          onToggle={togglePreferred}
        />
        <button
          type="button"
          onClick={() => {
            setSubmitError('')
            setConfirmIntent('submit')
          }}
        >
          입력 완료
        </button>
        <button
          type="button"
          className="button--secondary"
          onClick={() => {
            setSubmitError('')
            setConfirmIntent('skip')
          }}
        >
          건너뛰기
        </button>

        <Modal
          open={confirmIntent !== null}
          onClose={() => {
            // claude: Modal의 배경(overlay) 클릭은 isSubmitting을 모르고 무조건 onClose를 호출하므로, 저장 요청이 진행 중일 땐 여기서 막는다 — 안 그러면 모달이 먼저 닫혀버려서, 뒤늦게 도착하는 실패 응답의 submitError 메시지를 사용자가 볼 수 없게 된다.
            if (isSubmitting) return
            setConfirmIntent(null)
          }}
        >
          <div className="confirm-header">
            <span className="confirm-header__icon" aria-hidden="true">
              ✓
            </span>
            <strong className="confirm-header__title">입력을 확정할까요?</strong>
            <p className="confirm-header__desc">아래와 같이 제출됩니다.</p>
          </div>
          <p className="confirm-summary">
            가능한 시간 {availableOnlyCount}건 · 선호 시간 {preferredCount}건
          </p>
          <p className="confirm-notice">제출 후에도 투표 마감 전까지는 수정할 수 있어요.</p>
          {submitError && <p className="field-error">{submitError}</p>}
          <button type="button" onClick={handleConfirm} disabled={isSubmitting}>
            확정하기
          </button>
          <button
            type="button"
            className="button--secondary"
            onClick={() => setConfirmIntent(null)}
            disabled={isSubmitting}
          >
            돌아가기
          </button>
        </Modal>
      </div>
    )
  }

  return (
    <div className="page-stack transition-slide-up">
      <h2>가능한 시간을 먼저 선택해주세요</h2>
      <DatePaginationArrows canGoPrev={canGoPrev} canGoNext={canGoNext} onPrev={goPrev} onNext={goNext} />
      <ScheduleGrid slots={pageSlots} selectedKeys={availableKeys} variant="available" onToggle={toggleAvailable} />
      <button type="button" disabled={availableKeys.size === 0} onClick={() => setStep('preferred')}>
        다음
      </button>
      {availableKeys.size === 0 && <p className="field-error">가능한 시간을 최소 1개 선택해주세요</p>}
    </div>
  )
}

export default ScheduleEditor
