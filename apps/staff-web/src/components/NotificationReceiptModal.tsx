import type { NotificationReceipt } from "@baro-jinryo/shared";
import { ExternalLink, MessageCircleMore } from "lucide-react";
import { patientWebUrl } from "../config/publicUrls";
import { toPatientStatusUrl } from "../utils/patientStatusUrl";

interface NotificationReceiptModalProps {
  receipt: NotificationReceipt;
  onClose: () => void;
}

export function NotificationReceiptModal({ receipt, onClose }: NotificationReceiptModalProps) {
  const statusUrl = toPatientStatusUrl(receipt.openPath, patientWebUrl);

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
        <p>{receipt.recipientPhoneMasked} 번호로 아래 알림톡 mock을 생성했습니다.</p>
        <article className="alimtalk-preview" aria-label="현장 접수 알림톡 미리보기">
          <div className="alimtalk-preview__header">
            <span>바로진료</span>
            <strong>접수 완료 안내</strong>
          </div>
          <div className="alimtalk-preview__body">
            <p className="alimtalk-preview__title">현장 접수가 완료되었습니다.</p>
            <p>
              병원 대기 상태를 웹에서 확인할 수 있습니다. 웨이팅 취소가 필요하면
              병원 데스크로 전화해 주세요.
            </p>
            <a className="alimtalk-preview__link" href={statusUrl} target="_blank" rel="noreferrer">
              현재 대기 상태 보기
              <ExternalLink size={14} />
            </a>
          </div>
          <dl className="alimtalk-preview__meta">
            <div>
              <dt>수신 번호</dt>
              <dd>{receipt.recipientPhoneMasked}</dd>
            </div>
            <div>
              <dt>템플릿</dt>
              <dd>{receipt.templateCode}</dd>
            </div>
          </dl>
        </article>
        <div className="notification-preview-actions">
          <button className="secondary-button" type="button" onClick={onClose}>닫기</button>
          <a className="primary-button" href={statusUrl} target="_blank" rel="noreferrer">
            상태 화면 열기
          </a>
        </div>
      </section>
    </div>
  );
}
