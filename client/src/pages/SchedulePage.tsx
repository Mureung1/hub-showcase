import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import Modal from '../components/Modal.tsx'

function SchedulePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState<'available' | 'preferred'>('available')
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const handleConfirm = () => {
    setShowConfirmModal(false)
    navigate(`/a/${id}`)
  }

  return (
    <div className="page-stack">
      {step === 'available' ? (
        <>
          <h2>가능한 시간을 선택해주세요</h2>
          <p>(실제 드래그 선택 그리드는 2주차에 구현 예정)</p>
          <button type="button" onClick={() => setStep('preferred')}>
            다음
          </button>
        </>
      ) : (
        <>
          <h2>특별히 더 선호하는 시간대가 있으신가요?</h2>
          <button type="button" onClick={() => setShowConfirmModal(true)}>
            입력 완료
          </button>
          <button type="button" className="button--secondary" onClick={() => setShowConfirmModal(true)}>
            건너뛰기
          </button>
        </>
      )}

      <Modal open={showConfirmModal} onClose={() => setShowConfirmModal(false)}>
        <strong>입력을 확정할까요?</strong>
        <p>제출 후에도 투표 마감 전까지는 수정할 수 있어요.</p>
        <button type="button" onClick={handleConfirm}>
          확정하기
        </button>
        <button type="button" className="button--secondary" onClick={() => setShowConfirmModal(false)}>
          돌아가기
        </button>
      </Modal>
    </div>
  )
}

export default SchedulePage
