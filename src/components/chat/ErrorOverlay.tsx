type ErrorOverlayProps = {
  message: string;
  onClose: () => void;
};

export default function ErrorOverlay({ message, onClose }: ErrorOverlayProps) {
  return (
    <>
      <div className="overlay-dim" onClick={onClose} />
      <div className="overlay-sheet">
        <div className="confirm-header">
          <div className="confirm-icon">✕</div>
          <span className="confirm-message">처리하지 못했어요</span>
        </div>
        <p className="confirm-detail">{message}</p>
        <div className="confirm-actions">
          <button onClick={onClose}>확인</button>
        </div>
      </div>
    </>
  );
}
