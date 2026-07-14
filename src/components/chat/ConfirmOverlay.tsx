import type { ConfirmData } from '../../types/overlay';

type ConfirmOverlayProps = {
  data: ConfirmData;
  onClose: () => void;
};

export default function ConfirmOverlay({ data, onClose }: ConfirmOverlayProps) {
  return (
    <>
      <div className="overlay-dim" onClick={onClose} />
      <div className="overlay-sheet">
        <div className="confirm-header">
          <div className="confirm-icon">✓</div>
          <span className="confirm-message">{data.message}</span>
        </div>
        <p className="confirm-detail">{data.detail}</p>
        <div className="confirm-actions">
          {data.actions.map((action) => (
            <button key={action.action} onClick={onClose}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
