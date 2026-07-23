import { AlertTriangle, X } from 'lucide-react'

interface DeleteNoticeConfigModalProps {
  isDeleting: boolean
  deleteError: string | null
  onClose: () => void
  onConfirm: () => void
}

export function DeleteNoticeConfigModal({
  isDeleting,
  deleteError,
  onClose,
  onConfirm,
}: DeleteNoticeConfigModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="request-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deleteNoticeConfigTitle"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="deleteNoticeConfigTitle">설정 삭제</h2>
          <button
            className="modal-close-button"
            type="button"
            aria-label="삭제 확인 창 닫기"
            disabled={isDeleting}
            onClick={onClose}
          >
            <X size={20} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </header>

        <p className="delete-warning">
          <AlertTriangle size={20} strokeWidth={2.5} aria-hidden="true" />
          현재 공지 사이트 설정, 카테고리 설정, 저장된 공지 이력과 구독 정보가 삭제됩니다.
        </p>

        {deleteError && <p className="table-message error">{deleteError}</p>}

        <div className="modal-actions">
          <button type="button" disabled={isDeleting} onClick={onClose}>
            취소
          </button>
          <button className="danger-action" type="button" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </section>
    </div>
  )
}
