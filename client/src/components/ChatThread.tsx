import type { ChatMessage } from "../lib/api";

interface Props {
  messages: ChatMessage[];
  sending: boolean;
}

// "입력 중…" is shown purely from the `sending` flag — it appears exactly as
// long as the actual POST /message request is in flight, no separate timer.
export default function ChatThread({ messages, sending }: Props) {
  return (
    <div className="chat-messages">
      {messages.map((m) => (
        <div key={m.id} className={`chat-msg ${m.from}`}>
          {m.text}
        </div>
      ))}
      {sending && <div className="chat-msg typing">입력 중…</div>}
    </div>
  );
}
