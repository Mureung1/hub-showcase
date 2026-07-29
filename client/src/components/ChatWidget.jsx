import { useEffect, useRef, useState } from 'react';
import ChatPage from '../pages/ChatPage';
import chatbotIcon from '../assets/chatbot.webp';

// 짧은 클릭과 드래그를 구분하는 임계값(px). 이보다 적게 움직이면 클릭으로 간주한다.
const DRAG_THRESHOLD = 6;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// 예전엔 "/chat"라는 독립 탭이었지만, 지금은 모든 화면에 뜨는 드래그 가능한
// 플로팅 버튼(그래디)을 눌러야 나타나는 오버레이로 바뀌었다. 채팅 UI 자체
// (chat-window/chat-body/quick-replies)는 ChatPage.jsx를 그대로 재사용한다 —
// 여기서는 열림/닫힘 상태와 위치(오버레이 vs 페이지)만 담당한다.
function ChatWidget(props) {
  const [open, setOpen] = useState(false);
  // null이면 아직 CSS(right/bottom 고정)가 위치를 담당 중이라는 뜻
  const [position, setPosition] = useState(null);
  const fabRef = useRef(null);
  const dragRef = useRef(null); // { startX, startY, originX, originY }
  const movedRef = useRef(false);

  function clampToViewport(x, y) {
    const el = fabRef.current;
    const w = el?.offsetWidth ?? 60;
    const h = el?.offsetHeight ?? 60;
    return {
      x: clamp(x, 0, window.innerWidth - w),
      y: clamp(y, 0, window.innerHeight - h),
    };
  }

  // 마운트 시 CSS가 잡아준 현재 위치(우측 하단)를 그대로 px 좌표로 전환해
  // 드래그가 시작되기 전까지는 시각적으로 아무 변화가 없게 한다.
  useEffect(() => {
    const el = fabRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition(clampToViewport(rect.left, rect.top));
  }, []);

  useEffect(() => {
    function handleResize() {
      setPosition((prev) => (prev ? clampToViewport(prev.x, prev.y) : prev));
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function handlePointerDown(e) {
    if (!position) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    };
    movedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!movedRef.current && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      movedRef.current = true;
    }
    if (movedRef.current) {
      setPosition(clampToViewport(drag.originX + dx, drag.originY + dy));
    }
  }

  function handlePointerUp(e) {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function handleClick() {
    // 드래그로 움직인 직후의 클릭은 열기/닫기 토글을 하지 않는다.
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setOpen((prev) => !prev);
  }

  return (
    <>
      <button
        type="button"
        ref={fabRef}
        className="chat-fab"
        style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
        aria-label="그래디에게 물어보기"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
      >
        <img src={chatbotIcon} alt="" />
      </button>

      {open && (
        <div className="chat-overlay">
          <div className="chat-overlay-panel">
            <button
              type="button"
              className="chat-overlay-close"
              aria-label="챗봇 닫기"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
            <ChatPage {...props} />
          </div>
        </div>
      )}
    </>
  );
}

export default ChatWidget;
