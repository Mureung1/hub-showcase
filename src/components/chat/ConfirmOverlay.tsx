import type { ConfirmData } from '../../types/overlay';

type ConfirmOverlayProps = {
  data: ConfirmData;
  onClose: () => void;
  onUndo: () => void;
};

export default function ConfirmOverlay({ data, onClose, onUndo }: ConfirmOverlayProps) {
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
            <button key={action.action} onClick={action.action === 'undo' ? onUndo : onClose}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
