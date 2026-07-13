interface ClearConfirmModalProps {
  mode: "inbound" | "outbound";
  onCancel: () => void;
  onConfirm: () => void;
}

const MODE_LABEL = { inbound: "입고", outbound: "출고" } as const;

// 전체 비우기 확인(파괴적 동작 — §2). 목록 전체를 지우므로 확인 절차 필수.
// 아직 재고에 반영 전이라는 점을 명시해 불안을 덜어준다.
export function ClearConfirmModal({ mode, onCancel, onConfirm }: ClearConfirmModalProps) {
  const label = MODE_LABEL[mode];
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="confirm"
        role="dialog"
        aria-modal="true"
        aria-label={`${label} 목록 비우기 확인`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="confirm__title">{label} 목록을 비울까요?</h2>
        <p className="confirm__body">
          지금까지 스캔한 상품이 모두 사라져요. 아직 재고에는 반영되지 않았습니다.
        </p>
        <div className="confirm__actions">
          <button type="button" className="confirm__btn confirm__btn--ghost" onClick={onCancel}>
            취소
          </button>
          <button type="button" className="confirm__btn confirm__btn--danger" onClick={onConfirm}>
            비우기
          </button>
        </div>
      </div>
    </div>
  );
}
