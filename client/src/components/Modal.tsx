import { useEffect, useRef } from 'react' // claude: 접근성(Escape 닫기/포커스 관리) 구현에 필요한 훅 추가 - 아래 study 주석이 붙은 import type 줄은 그대로 두고 별도 줄로 분리.
import type { MouseEvent, ReactNode } from 'react' // study: import type - 타입 체크용으로만 사용한다는 뜻.
import { createPortal } from 'react-dom'
import './Modal.css'

type ModalProps = {  // study: Modal 에 필요한 3가지 props (계약서)
  open: boolean // study: 모달창 open close 여부
  onClose: () => void // study: 닫는 함수(그냥 실행만)
  children: ReactNode // study: 실제 모달창 내용. Modal 태그 사이에 내용이 자동으로 children prop에 담김.
}

function Modal({ open, onClose, children }: ModalProps) { // study: 부모가 넘겨준? props 구조 분해.
  const cardRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  // claude: 아래 포커스 관리 effect가 onClose를 "지금 값"으로 읽되 의존성에는 넣지 않기 위한 ref.
  // 호출부가 모두 onClose를 인라인 화살표 함수로 넘겨서(예: DateRangeField의 `onClose={() => setOpen(false)}`)
  // 부모가 리렌더될 때마다 함수 객체가 새로 만들어진다. 이걸 의존성 배열에 그대로 두면 모달이 열려 있는데도
  // 매 리렌더마다 cleanup(트리거로 포커스 복귀) → 재실행(카드로 포커스)이 돌아서 포커스가 튀었다.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // claude: Hooks는 조건부 return보다 항상 위에서 호출해야 해서(Rules of Hooks), 아래의 "if (!open) return null"보다
  // 앞으로 옮겨왔다(study 주석은 원문 그대로 유지). 열릴 때 지금 포커스돼 있던 요소(트리거)를 기억해두고, 모달 내부에
  // 이미 포커스된 요소가 없으면(DateRangeField의 달력처럼 내부 위젯이 스스로 포커스를 잡는 경우가 있어 그건 건드리지
  // 않음) 모달 카드로 포커스를 옮긴다. Escape 키는 오버레이 클릭과 똑같이 onClose를 호출하므로, ScheduleEditor의
  // isSubmitting, AdminDashboard의 isClosing 같은 "제출 중엔 안 닫힘" 가드도 onClose 안에 있어서 그대로 적용된다.
  // 닫힐 때(effect cleanup)는 리스너를 지우고 트리거로 포커스를 되돌린다.
  // claude: 의존성은 [open]만 — 이 effect는 "열림/닫힘이 실제로 바뀔 때"만 돌아야 한다. Escape 핸들러는
  // 키를 누른 시점에 onCloseRef.current를 읽으므로 항상 최신 onClose(위의 제출 중 가드 포함)가 호출된다.
  useEffect(() => {
    if (!open) return

    triggerRef.current = document.activeElement as HTMLElement | null
    if (!cardRef.current?.contains(document.activeElement)) {
      cardRef.current?.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      triggerRef.current?.focus()
    }
  }, [open])

  if (!open) return null // study: 모달 보여주는게 open으로만 결정되므로, 라우터와 무관하게 동작

  const stopPropagation = (event: MouseEvent) => event.stopPropagation()
  // study: 모달 창 내부 클릭이 외부에 영향을 끼치지 않도록함. (Mouse이벤트 => 버블링 방지)

  // claude: document.body에 포탈로 렌더링 — 그냥 여기 두면 이 Modal을 호출한 쪽의 <label> 등 조상 DOM에
  // 계속 속하게 되는데, WebKit(iOS 전 브라우저)은 label 내부 어디를 클릭해도 label.control(첫 labelable
  // 자손, 예: 트리거 버튼)에 클릭을 한 번 더 합성해서 쏘는 버그가 있다. 그 결과 모달 안 버튼을 눌러도
  // 트리거가 고스트 클릭으로 다시 눌린 것처럼 동작해 모달이 안 닫히는 문제가 있었음 — portal로 DOM 트리를
  // 분리하면 더 이상 label의 자손이 아니게 되어 이 문제가 발생하지 않는다.
  return createPortal(
    <div className="modal-overlay transition-fade-in" onClick={onClose}>
      <div
        className="modal-card transition-slide-up"
        onClick={stopPropagation}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        ref={cardRef}
      >
        {children}
      </div>
    </div>,
    document.body,
  ) // study: 바깥(overlay) 클릭시 onClose 로 창 닫힘, 내부(modal-card)클릭 시 버블링 방지.
}

export default Modal
