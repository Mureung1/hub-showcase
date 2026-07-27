import { useEffect, useState } from "react";
import ChatThread from "./ChatThread";
import ChatInput from "./ChatInput";
import MarkdownViewer from "./MarkdownViewer";
import MarkdownEditor from "./MarkdownEditor";
import { API_BASE_URL, type Step, type ChatMessage, type DocumentRecord } from "../lib/api";

const STATUS_BADGE: Record<Step["status"], { label: string; className: string }> = {
  done: { label: "완료", className: "badge success" },
  active: { label: "진행 중", className: "badge warning" },
  pending: { label: "대기", className: "badge" },
};

interface Props {
  step: Step;
  onStepsRefreshNeeded: () => void;
}

export default function WorkspaceMainPanel({ step, onStepsRefreshNeeded }: Props) {
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/api/documents/${step.id}`).then((res) => (res.ok ? res.json() : null)),
      fetch(`${API_BASE_URL}/api/chat/${step.id}/messages`).then((res) => res.json()),
    ]).then(([doc, msgs]: [DocumentRecord | null, ChatMessage[]]) => {
      setDocument(doc);
      setMessages(msgs);
      setLoading(false);
    });
  }, [step.id]);

  async function handleSend(text: string) {
    setChatError(null);
    const optimisticUser: ChatMessage = {
      id: `local-${Date.now()}`,
      from: "user",
      text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setSending(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/${step.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "chat failed");

      setMessages(data.messages);
      if (data.document) {
        setDocument(data.document);
        onStepsRefreshNeeded(); // progress_pct depends on the new document's checklist
      }
    } catch (err) {
      setChatError(
        err instanceof Error && err.message !== "chat failed"
          ? err.message
          : "메시지 전송에 실패했습니다. 다시 시도해주세요."
      );
    } finally {
      setSending(false);
    }
  }

  function handleEdit() {
    setDraft(document?.content ?? "");
    setIsEditing(true);
  }
  function handleCancel() {
    setIsEditing(false);
  }
  async function handleSave() {
    const res = await fetch(`${API_BASE_URL}/api/documents/${step.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft, path: document?.path }),
    });
    const updated: DocumentRecord = await res.json();
    setDocument(updated);
    setIsEditing(false);
    onStepsRefreshNeeded();
  }

  async function handleApprove() {
    setApproving(true);
    try {
      await fetch(`${API_BASE_URL}/api/steps/${step.id}/approve`, { method: "POST" });
      onStepsRefreshNeeded();
    } finally {
      setApproving(false);
    }
  }

  return (
    <>
      <div className="ws-top">
        <div>
          <div className="ws-eyebrow">
            STEP {String(step.id).padStart(2, "0")} / 09 · {step.agent_name}
          </div>
          <div className="ws-title">{step.name}</div>
        </div>
        <span className={STATUS_BADGE[step.status].className}>{STATUS_BADGE[step.status].label}</span>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-dim)" }}>불러오는 중…</div>
      ) : step.status === "done" ? (
        <div>
          <label className="label-mono">문서</label>
          {document ? (
            <MarkdownViewer content={document.content} />
          ) : (
            <div style={{ color: "var(--text-mute)", fontSize: 13 }}>문서가 없습니다.</div>
          )}
        </div>
      ) : (
        <>
          {/* Which Step has a working chat is entirely up to the backend (AGENT_PROMPTS
              in agentPrompts.ts) — Steps without a registered agent just get a clear
              error from the first send attempt via chatError below, no hardcoding here. */}
          <div className="qa-box">
            <div className="chat-head">
              <span>{step.agent_name}</span>
              <span>{messages.length}개 메시지</span>
            </div>
            {messages.length === 0 && !sending ? (
              <div style={{ color: "var(--text-mute)", fontSize: 13 }}>
                아직 대화가 없습니다. 메시지를 보내 대화를 시작해보세요.
              </div>
            ) : (
              <ChatThread messages={messages} sending={sending} />
            )}
            <ChatInput onSend={handleSend} disabled={sending} />
          </div>
          {chatError && <div style={{ color: "var(--red)", fontSize: 12.5 }}>{chatError}</div>}

          <div>
            <div className="md-preview-head">
              <span className="path">{document?.path ?? "문서 없음"}</span>
              {document && !isEditing && (
                <span
                  onClick={handleEdit}
                  style={{ color: "var(--text-dim)", cursor: "pointer" }}
                  title="원문 수정"
                >
                  ✎ 수정
                </span>
              )}
            </div>
            {!document ? (
              <div style={{ color: "var(--text-mute)", fontSize: 13 }}>
                아직 문서가 없습니다. 대화를 통해 정보가 모이면 자동으로 생성됩니다.
              </div>
            ) : isEditing ? (
              <>
                <MarkdownEditor value={draft} onChange={setDraft} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <button onClick={handleCancel}>취소</button>
                  <button className="primary" onClick={handleSave}>
                    저장
                  </button>
                </div>
              </>
            ) : (
              <MarkdownViewer content={document.content} />
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "auto" }}>
            <button className="primary" disabled={approving} onClick={handleApprove}>
              Approve ✓
            </button>
          </div>
        </>
      )}
    </>
  );
}
