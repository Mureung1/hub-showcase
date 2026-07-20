import type { MouseEvent, ReactNode } from 'react' // study: import type - 타입 체크용으로만 사용한다는 뜻.
import './Modal.css'

type ModalProps = {  // study: Modal 에 필요한 3가지 props (계약서)
  open: boolean // study: 모달창 open close 여부
  onClose: () => void // study: 닫는 함수(그냥 실행만)
  children: ReactNode // study: 실제 모달창 내용. Modal 태그 사이에 내용이 자동으로 children prop에 담김.
}

function Modal({ open, onClose, children }: ModalProps) { // study: 부모가 넘겨준? props 구조 분해.
  if (!open) return null // study: 모달 보여주는게 open으로만 결정되므로, 라우터와 무관하게 동작

  const stopPropagation = (event: MouseEvent) => event.stopPropagation() 
  // study: 모달 창 내부 클릭이 외부에 영향을 끼치지 않도록함. (Mouse이벤트 => 버블링 방지)

  return (
    <div className="modal-overlay transition-fade-in" onClick={onClose}>
      <div className="modal-card transition-slide-up" onClick={stopPropagation}>
        {children}
      </div>
    </div>
  ) // study: 바깥(overlay) 클릭시 onClose 로 창 닫힘, 내부(modal-card)클릭 시 버블링 방지.
}

export default Modal
