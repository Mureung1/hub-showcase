import { useEffect, useState } from 'react';
import { episodes } from './mockEpisodes';

// 채팅방 경계 없이 모든 episode를 하나의 연속된 스트림으로 보여준다.
// revealed는 "잠긴 episode 중 어떤 걸 열었는지"를 이 화면만의 state로 들고 있다.
// selectedId는 App이 내려준 props — 사이드바에서 고른 episode로 스크롤만 이동시킨다.
function ChatView({ selectedId }) {
  const [revealed, setRevealed] = useState(new Set());

  useEffect(() => {
    if (!selectedId) return;
    const el = document.getElementById(`anchor-${selectedId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedId]);

  function reveal(id) {
    setRevealed((prev) => new Set(prev).add(id));
  }

  return (
    <main className="app-main">
      <div className="chat-header">
        <div className="title">TideNote</div>
        <div className="subtitle">
          Conversation is one continuous stream — episodes are just markers in it.
        </div>
      </div>

      <div className="chat-stream">
        {episodes
          .filter((ep) => ep.tab === 'recent')
          .map((ep) => (
            <div key={ep.id}>
              <div id={`anchor-${ep.id}`} className="stream-chip">
                {ep.time} · Topic: {ep.topic}
              </div>

              {ep.submerged && !revealed.has(ep.id) ? (
                <div className="submerged-block">
                  <div className="ep-summary">{ep.summary}</div>
                  <div className="submerged-text">
                    {ep.messages.map((m, i) => (
                      <p key={i}>{m.text}</p>
                    ))}
                  </div>
                  <button className="pill-btn muted" onClick={() => reveal(ep.id)}>
                    View original
                  </button>
                </div>
              ) : (
                ep.messages.map((m, i) => (
                  <div key={i} className={m.from === 'user' ? 'bubble-user' : 'bubble-ai'}>
                    {m.text}
                  </div>
                ))
              )}
            </div>
          ))}
      </div>

      <div className="input-bar">
        <input type="text" placeholder="Message" />
        <button className="send-btn">↑</button>
      </div>
    </main>
  );
}

export default ChatView;
