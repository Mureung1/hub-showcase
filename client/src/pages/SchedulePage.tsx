import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import Modal from '../components/Modal.tsx'


// study: available/preferred는 서로 다른 독립적인 화면이 아니라 "일정 입력"이라는 하나의 작업의 순차적인 두 단계임.
// study: 별도 컴포넌트/파일/페이지로 쪼개면 오히려 state를 부모-자식 간에 주고받는 복잡함만 늘어남. 
// study: 따라서 하나의 컴포넌트 안에서 step이라는 state로 화면 내용만 갈아 끼움. 

function SchedulePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState<'available' | 'preferred'>('available') // study: typescript 문법. 전자 혹은 후자 중 하나의 타입만 가능하다. (처음은 available로 되어있음)
  const [showConfirmModal, setShowConfirmModal] = useState(false) 

  const handleConfirm = () => {
    setShowConfirmModal(false)
    navigate(`/a/${id}`)
  }
  // study: ==(느슨한 비교, 1=='1' true), ===(엄격한 비교, 타입까지 일치해야 함.)
  // study: 
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
