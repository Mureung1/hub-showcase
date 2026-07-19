import { useState } from 'react'
import { useNavigate } from 'react-router'
import { slotKey, type ScheduleSlot, type SubmitResponseRequest } from 'shared'
import type { SubmitResult } from '../lib/useScheduleResponse.ts'
import ScheduleGrid from './ScheduleGrid.tsx'
import Modal from './Modal.tsx'

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
  const [step, setStep] = useState<'available' | 'preferred'>('available')
  const [availableKeys, setAvailableKeys] = useState<Set<string>>(() => new Set(initialAvailable.map(slotKey)))
  const [preferredKeys, setPreferredKeys] = useState<Set<string>>(() => new Set(initialPreferred.map(slotKey)))
  const [confirmIntent, setConfirmIntent] = useState<'submit' | 'skip' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

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
    } else {
      setSubmitError(result.error)
    }
  }

  if (step === 'preferred') {
    return (
      <div className="page-stack">
        <h2>특별히 더 선호하는 시간대가 있으신가요?</h2>
        <ScheduleGrid
          slots={candidateSlots}
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
          <strong>입력을 확정할까요?</strong>
          <p>제출 후에도 투표 마감 전까지는 수정할 수 있어요.</p>
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
    <div className="page-stack">
      <h2>가능한 시간을 선택해주세요</h2>
      <ScheduleGrid slots={candidateSlots} selectedKeys={availableKeys} variant="available" onToggle={toggleAvailable} />
      <button type="button" disabled={availableKeys.size === 0} onClick={() => setStep('preferred')}>
        다음
      </button>
      {availableKeys.size === 0 && <p className="field-error">가능한 시간을 최소 1개 선택해주세요</p>}
    </div>
  )
}

export default ScheduleEditor
