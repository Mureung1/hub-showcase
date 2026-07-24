import type { NotificationReceipt } from "@baro-jinryo/shared";
import { MessageCircleMore } from "lucide-react";

interface NotificationReceiptModalProps {
  receipt: NotificationReceipt;
  onClose: () => void;
}

export function NotificationReceiptModal({ receipt, onClose }: NotificationReceiptModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="notification-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-preview-title"
      >
        <span className="notification-preview-icon"><MessageCircleMore size={24} /></span>
        <h2 id="notification-preview-title">현장 접수가 등록되었습니다</h2>
        <p>{receipt.recipientPhoneMasked} 번호로 접수 완료 알림톡 mock을 생성했습니다.</p>
        <div className="notification-preview-actions">
          <button className="secondary-button" type="button" onClick={onClose}>닫기</button>
          <a className="primary-button" href={receipt.openPath} target="_blank" rel="noreferrer">
            Mock 알림톡 보기
          </a>
        </div>
      </section>
    </div>
  );
}
