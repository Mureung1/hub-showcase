import { useEffect } from "react";

// 방금 무슨 일이 일어났는지 알리고, 되돌릴 수 있으면 되돌리기 버튼을 같이 준다.
//
// 화면 아래 고정이다. 과목 목록이 길어도 방금 한 일 옆에서 알림을 볼 수 있어야 하고,
// 위에 띄우면 스크롤을 올려야 보인다.
const AUTO_HIDE_MS = 6000;

function Notice({ message, onUndo, onClose }) {
  // 되돌리기가 있으면 누를 시간을 줘야 하므로 자동으로 닫지 않는다.
  useEffect(() => {
    if (onUndo) {
      return;
    }

    const timer = setTimeout(onClose, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [message, onUndo, onClose]);

  return (
    <div className="notice" role="status">
      <span className="notice-message">{message}</span>

      <div className="notice-actions">
        {onUndo && (
          <button type="button" className="notice-undo" onClick={onUndo}>
            되돌리기
          </button>
        )}
        <button type="button" className="notice-close" onClick={onClose} aria-label="알림 닫기">
          ✕
        </button>
      </div>
    </div>
  );
}

export default Notice;
