import { useState } from 'react';

// episode는 props로 받아서 "어떤 대화를 보여줄지"만 결정하고,
// revealed는 이 화면 자체의 state — "지금 원문을 열었는지"는 이 컴포넌트만 알면 된다.
function ChatView({ episode, onBack }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="chat-screen">
      <button className="back-btn" onClick={onBack}>
        ←
      </button>

      <div className="stream-chip">
        {episode.time} · Topic: {episode.topic}
      </div>

      {episode.submerged && !revealed && (
        <div className="submerged-block">
          <div className="ep-summary">{episode.summary}</div>
          <div className="submerged-text">
            {episode.messages.map((m, i) => (
              <p key={i}>{m.text}</p>
            ))}
          </div>
          <button className="pill-btn muted" onClick={() => setRevealed(true)}>
            View original
          </button>
        </div>
      )}

      {(!episode.submerged || revealed) &&
        episode.messages.map((m, i) => (
          <div key={i} className={m.from === 'user' ? 'bubble-user' : 'bubble-ai'}>
            {m.text}
          </div>
        ))}
    </div>
  );
}

export default ChatView;
