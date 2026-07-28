import { useState } from 'react';
import ChatPage from '../pages/ChatPage';
import chatbotIcon from '../assets/chatbot.webp';

// 예전엔 "/chat"라는 독립 탭이었지만, 지금은 모든 화면 우측 하단에 뜨는
// 플로팅 버튼(그래디)을 눌러야 나타나는 오버레이로 바뀌었다. 채팅 UI 자체
// (chat-window/chat-body/quick-replies)는 ChatPage.jsx를 그대로 재사용한다 —
// 여기서는 열림/닫힘 상태와 위치(오버레이 vs 페이지)만 담당한다.
function ChatWidget(props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="chat-fab"
        aria-label="그래디에게 물어보기"
        onClick={() => setOpen((prev) => !prev)}
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
