import { useEffect, useState } from 'react';
import TideCheck from './TideCheck';
import Episodes from './Episodes';
import ChatView from './ChatView';
import { API_BASE } from './apiBase';
import './screens.css';

// 웹 서비스 레이아웃: 사이드바(Episodes) + 메인(ChatView)이 항상 같이 보이고,
// Tide Check는 그 위에 뜨는 모달이다.
// messages는 여기서 한 번만 불러와 두 화면에 props로 내려준다 — Episodes는 이걸
// episode 단위로 묶어서 보여주고, ChatView는 그대로 스트림으로 보여준다.
function App() {
  const [showTideCheck, setShowTideCheck] = useState(true); // 하루 최소 1회 필수 체크인
  const [messages, setMessages] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [scrollToId, setScrollToId] = useState(null);

  function loadMessages() {
    return fetch(`${API_BASE}/api/messages`)
      .then((res) => {
        if (!res.ok) throw new Error('server');
        return res.json();
      })
      .then((data) => setMessages(data))
      .catch(() => {
        setLoadError('지난 대화를 불러오지 못했어요. 서버 연결을 확인해주세요.');
      });
  }

  useEffect(() => {
    loadMessages();
  }, []);

  return (
    <div className="app-shell">
      <Episodes
        messages={messages}
        onSelectEpisode={(episode) => setScrollToId(episode.id)}
        onUpdateTide={() => setShowTideCheck(true)}
      />
      <ChatView
        messages={messages}
        loadError={loadError}
        onMessagesChange={loadMessages}
        scrollToId={scrollToId}
      />

      {showTideCheck && (
        <div className="modal-overlay">
          <div className="tc-modal-wrap">
            <TideCheck onDone={() => setShowTideCheck(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
