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
    } catch (err) {
      const message = err?.response?.data?.error?.message ?? "요청 처리 중 오류가 발생했습니다.";
      setMessages((prev) => [...prev, { id: Date.now(), prompt, error: message }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-demo">
      <div className="chat-demo__thread">
        {messages.length === 0 && (
          <p className="chat-demo__empty">프롬프트를 입력해보세요.</p>
        )}
        {messages.map((m) =>
          m.error ? (
            <ChatError key={m.id} prompt={m.prompt} message={m.error} />
          ) : (
            <ChatExchange key={m.id} prompt={m.prompt} result={m.result} />
          )
        )}
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

function ChatError({ prompt, message }) {
  return (
    <div className="chat-exchange">
      <div className="chat-exchange__prompt">{prompt}</div>
      <Card className="chat-exchange__result">
        <p className="chat-exchange__block-reason">{message}</p>
      </Card>
    </div>
  );
}
