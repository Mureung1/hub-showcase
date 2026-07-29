import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import chatbotIcon from '../assets/chatbot.webp';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const CHAT_URL = `${API_BASE_URL}/api/chat`;
const SEMESTERS = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];
const QUICK_REPLIES = ['학기별 추천 계획 보기', '전공선택 부족분 확인', '종합설계 요건 설명'];

// props는 App.jsx가 들고 있는 상태값을 읽기 전용으로만 받는다 — 바구니/대시보드
// 로직은 여기서 건드리지 않는다.
function ChatPage({ goalTotal, goalMajor, goalGeneral, progressSubmitted, basketCourses, track }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSemester, setCurrentSemester] = useState(SEMESTERS[0]);
  const bodyRef = useRef(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(CHAT_URL, {
        message: trimmed,
        targets: {
          totalCredits: goalTotal,
          majorCredits: goalMajor,
          generalCredits: goalGeneral,
        },
        progressSubmitted,
        basketCourses,
        track,
        currentSemester,
      });
      setMessages((prev) => [...prev, { role: 'bot', text: res.data.reply ?? '' }]);
    } catch (err) {
      console.error('챗봇 응답 실패:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: '잠시 후 다시 시도해주세요.', isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="chat-page">
      <div className="chat-page-avatar">
        <img src={chatbotIcon} alt="그래디" />
      </div>
      <div className="section-title">
        <h2>그래디 Grady</h2>
        <span>궁금한 걸 물어보면 계산 엔진을 호출해 정확한 답을 드려요!</span>
      </div>

      <div className="sim-input-row">
        <label htmlFor="chat-semester">현재 학기</label>
        <select
          id="chat-semester"
          value={currentSemester}
          onChange={(e) => setCurrentSemester(e.target.value)}
        >
          {SEMESTERS.map((semester) => (
            <option key={semester} value={semester}>
              {semester}
            </option>
          ))}
        </select>
      </div>

      <div className="chat-shell">
        <div className="chat-window">
          <div className="chat-head">
            <span className="dotstatus" />
            <div>
              <b>그래디 Grady</b>
              <span>졸업 플래닝 어시스턴트 | 계산엔진 연결됨</span>
            </div>
          </div>

          <div className="chat-body" ref={bodyRef}>
            {messages.length === 0 && (
              <p className="chat-empty">
                궁금한 걸 편하게 물어보세요. 예: "다음 학기에 15학점만 들어도 졸업할 수 있어?"
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}${m.isError ? ' error' : ''}`}>
                {m.text}
              </div>
            ))}
            {loading && <div className="bubble bot loading">생각 중...</div>}
          </div>

          <form className="chat-input" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="메시지를 입력하세요…"
              disabled={loading}
            />
            <button type="submit" className="send" disabled={loading || !input.trim()} aria-label="전송">
              ➤
            </button>
          </form>
        </div>

        <div className="quick-replies">
          {QUICK_REPLIES.map((chip) => (
            <button
              key={chip}
              type="button"
              className="chip"
              onClick={() => sendMessage(chip)}
              disabled={loading}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
