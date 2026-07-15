import { useState } from "react";
import Card from "../../components/Card.jsx";
import Badge from "../../components/Badge.jsx";
import Button from "../../components/Button.jsx";
import { sendChatMessage } from "../../api/chat.js";
import "./ChatDemo.css";

export default function ChatDemo() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;

    setInput("");
    setLoading(true);
    try {
      const result = await sendChatMessage(prompt);
      setMessages((prev) => [...prev, { id: Date.now(), prompt, result }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-demo">
      <div className="chat-demo__thread">
        {messages.length === 0 && (
          <p className="chat-demo__empty">
            프롬프트를 입력해보세요. 전화번호·이메일이 섞이면 마스킹되고,
            "영업비밀" 같은 단어가 있으면 차단됩니다.
          </p>
        )}
        {messages.map((m) => (
          <ChatExchange key={m.id} prompt={m.prompt} result={m.result} />
        ))}
        {loading && <p className="chat-demo__loading">검사 중...</p>}
      </div>

      <form className="chat-demo__input-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What's in your mind?..."
        />
        <Button type="submit" disabled={loading}>
          전송
        </Button>
      </form>
    </div>
  );
}

function ChatExchange({ prompt, result }) {
  return (
    <div className="chat-exchange">
      <div className="chat-exchange__prompt">{prompt}</div>

      <Card className="chat-exchange__result">
        <div className="chat-exchange__result-header">
          <Badge status={result.status} />
        </div>

        {result.status === "blocked" && (
          <p className="chat-exchange__block-reason">{result.blockReason}</p>
        )}

        {result.status === "masked" && (
          <>
            <p className="chat-exchange__masked-text">{result.maskedPrompt}</p>
            <p className="chat-exchange__response">{result.response}</p>
          </>
        )}

        {result.status === "pass" && (
          <p className="chat-exchange__response">{result.response}</p>
        )}

        {result.detections?.length > 0 && (
          <div className="chat-exchange__detections">
            {result.detections.map((d, i) => (
              <span key={i} className="chat-exchange__detection-tag">
                {d.type}: {d.value}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
