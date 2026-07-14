import { useEffect, useRef, useState } from 'react';
import Mascot from '../components/Mascot.jsx';
import { SendIcon } from '../components/icons.jsx';

const BOT_REPLY = '프로토타입 단계라 지금은 정해진 답변만 드려요. 실제 서비스에서는 취향에 맞는 빵집을 추천해드릴게요!';

// 부가 기능(4주차 시간 여유 시 LLM 연동). 지금은 정해진 답변만 보여주는 placeholder.
export default function ChatScreen() {
  const [messages, setMessages] = useState([{ from: 'bot', text: '안녕하세요! 오늘은 어떤 빵이 당기세요?' }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { from: 'user', text }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { from: 'bot', text: BOT_REPLY }]);
    }, 700);
  };

  return (
    <section className="screen-chat">
      <div className="chat-log" ref={logRef}>
        {messages.map((m, i) => (
          <div className={`bubble-row ${m.from}`} key={i}>
            {m.from === 'bot' && <Mascot />}
            <div className={`bubble ${m.from}`}>{m.text}</div>
          </div>
        ))}
        {typing && (
          <div className="bubble-row bot">
            <Mascot />
            <div className="bubble bot">
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="예: 달달한 거 먹고 싶어"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button type="button" onClick={send} disabled={!input.trim()} aria-label="보내기">
          <SendIcon style={{ width: 15, height: 15, stroke: '#fff' }} />
        </button>
      </div>
      <p className="chat-hint">실제 서비스에서는 LLM이 보유 데이터 중 적합한 곳을 추천합니다.</p>
    </section>
  );
}
