import { useEffect, useRef, useState } from 'react';
import { API_BASE } from './apiBase';

// 실제 대화 화면 — messages state는 서버에서 받아온 진짜 기록이다.
// 서버가 각 메시지에 submerged(잠김 여부)와 summary를 같이 내려주면,
// 그걸 그대로 블러 처리해서 보여준다 — 판단 로직 자체는 서버(D_gen vs D_recall)에 있다.
function ChatView() {
  const [messages, setMessages] = useState([]);
  const [revealed, setRevealed] = useState(new Set());
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [sendError, setSendError] = useState(null);
  const streamEndRef = useRef(null);

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

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function reveal(id) {
    setRevealed((prev) => new Set(prev).add(id));
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setSendError(null);

    let res;
    try {
      res = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
    } catch {
      setSendError('서버에 연결할 수 없어요. 네트워크를 확인해주세요.');
      setSending(false);
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSendError(body.error || '메시지를 보내지 못했어요.');
      setSending(false);
      return;
    }

    setInput('');
    setSending(false);
    // 새 메시지의 submerged 여부도 서버가 판단하므로, 목록을 다시 불러온다.
    loadMessages();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <main className="app-main">
      <div className="chat-header">
        <div className="title">TideNote</div>
        <div className="subtitle">실제 대화가 저장됩니다 — 채팅방 경계 없이 하나의 스트림으로 이어집니다.</div>
      </div>

      <div className="chat-stream">
        {loadError && (
          <div className="stream-chip" style={{ color: '#e5484d' }}>{loadError}</div>
        )}
        {messages.map((m) =>
          m.submerged && !revealed.has(m.id) ? (
            <div key={m.id} className="submerged-block">
              <div className="ep-summary">{m.summary}</div>
              <div className="submerged-text">
                <p>{m.content}</p>
              </div>
              <button className="pill-btn muted" onClick={() => reveal(m.id)}>
                View original
              </button>
            </div>
          ) : (
            <div key={m.id} className={m.role === 'user' ? 'bubble-user' : 'bubble-ai'}>
              {m.content}
            </div>
          )
        )}
        <div ref={streamEndRef} />
      </div>

      {sendError && (
        <div className="stream-chip" style={{ color: '#e5484d', alignSelf: 'center' }}>{sendError}</div>
      )}

      <div className="input-bar">
        <input
          type="text"
          placeholder="Message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button className="send-btn" onClick={handleSend} disabled={sending}>
          {sending ? '…' : '↑'}
        </button>
      </div>
    </main>
  );
}

export default ChatView;
