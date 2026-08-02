import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import Card from "../../components/Card.jsx";
import Badge from "../../components/Badge.jsx";
import Button from "../../components/Button.jsx";
import { sendChatMessage } from "../../api/chat.js";
import "./ChatDemo.css";

const MAX_FILES = 5;

// 파일 입력의 accept 힌트(강제는 아님, 실제 검증은 백엔드). 대표 텍스트/코드 형식만.
const ACCEPT_HINT =
  ".txt,.csv,.tsv,.log,.md,.json,.yaml,.yml,.xml,.html,.css,.scss,.env,.ini,.conf,.toml," +
  ".js,.jsx,.ts,.tsx,.py,.java,.kt,.go,.rb,.php,.rs,.c,.cpp,.h,.hpp,.cs,.swift,.sql,.sh,.vue,text/*";

export default function ChatDemo() {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragDepth = useRef(0); // dragenter/leave가 자식 요소마다 튀는 걸 상쇄

  // 입력 줄 수에 맞춰 높이를 늘린다 (max-height는 CSS에서 제한)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  function addFiles(fileList) {
    const incoming = Array.from(fileList);
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of incoming) {
        // 이름+크기가 같으면 같은 파일로 보고 중복 추가하지 않는다.
        if (!merged.some((x) => x.name === f.name && x.size === f.size)) merged.push(f);
      }
      return merged.slice(0, MAX_FILES);
    });
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitPrompt() {
    const prompt = input.trim();
    if ((!prompt && files.length === 0) || loading) return;

    const attached = files;
    const attachedNames = files.map((f) => f.name);
    setInput("");
    setFiles([]);
    setLoading(true);
    try {
      const result = await sendChatMessage(prompt, attached);
      setMessages((prev) => [...prev, { id: Date.now(), prompt, files: attachedNames, result }]);
    } catch (err) {
      const message = err?.response?.data?.error?.message ?? "요청 처리 중 오류가 발생했습니다.";
      setMessages((prev) => [...prev, { id: Date.now(), prompt, files: attachedNames, error: message }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    submitPrompt();
  }

  // Enter는 전송, Shift+Enter는 줄바꿈. 한글 조합 중(isComposing) Enter는 무시한다.
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submitPrompt();
    }
  }

  function handleFileChange(e) {
    addFiles(e.target.files);
    e.target.value = ""; // 같은 파일 다시 선택 가능하게 초기화
  }

  function handleDragEnter(e) {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }
  function handleDragOver(e) {
    e.preventDefault();
  }
  function handleDragLeave(e) {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }
  function handleDrop(e) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  const canSubmit = !loading && (input.trim() || files.length > 0);

  return (
    <div
      className={`chat-demo${dragging ? " chat-demo--dragover" : ""}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="chat-demo__thread">
        {messages.length === 0 && (
          <div className="chat-demo__empty">
            <p className="chat-demo__empty-title">채팅 데모</p>
            <p className="chat-demo__empty-desc">
              입력한 요청은 실제 LLM(현재 OpenAI GPT-4o mini)으로 나가기 전 게이트웨이가 검사합니다.
              전화번호·API 키·사설 IP 같은 민감정보는 값만 가려지고 코드 로직은 그대로 전달됩니다.
              텍스트를 입력하거나 파일을 첨부해 자유롭게 사용해보세요.
            </p>
          </div>
        )}
        {messages.map((m) =>
          m.error ? (
            <ChatError key={m.id} prompt={m.prompt} files={m.files} message={m.error} />
          ) : (
            <ChatExchange key={m.id} prompt={m.prompt} files={m.files} result={m.result} />
          )
        )}
        {loading && <p className="chat-demo__loading">검사 중...</p>}
      </div>

      {dragging && <div className="chat-demo__drop-hint">여기에 파일을 놓으세요</div>}

      <div className="chat-demo__composer">
      {files.length > 0 && (
        <div className="chat-demo__attachments">
          {files.map((f, i) => (
            <span key={`${f.name}-${i}`} className="chat-attachment">
              <span className="chat-attachment__name">{f.name}</span>
              <button
                type="button"
                className="chat-attachment__remove"
                onClick={() => removeFile(i)}
                aria-label={`${f.name} 첨부 취소`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <form className="chat-demo__input-bar" onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_HINT}
          onChange={handleFileChange}
          hidden
        />
        <button
          type="button"
          className="chat-demo__attach-btn"
          onClick={() => fileInputRef.current?.click()}
          aria-label="파일 첨부"
          title="파일 첨부"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's in your mind?... (파일 드래그·첨부 가능)"
        />
        <Button type="submit" disabled={!canSubmit}>
          전송
        </Button>
      </form>
      </div>
    </div>
  );
}

function PromptBubble({ prompt, files }) {
  if (!prompt && (!files || files.length === 0)) return null;
  return (
    <div className="chat-exchange__prompt">
      {prompt && <div className="chat-exchange__prompt-text">{prompt}</div>}
      {files?.length > 0 && (
        <div className="chat-exchange__prompt-files">
          {files.map((name, i) => (
            <span key={`${name}-${i}`} className="chat-exchange__prompt-file">
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatExchange({ prompt, files, result }) {
  return (
    <div className="chat-exchange">
      <PromptBubble prompt={prompt} files={files} />

      <Card className="chat-exchange__result">
        <div className="chat-exchange__result-header">
          <Badge status={result.status} />
        </div>

        {result.status === "blocked" && (
          <p className="chat-exchange__block-reason">{result.blockReason}</p>
        )}

        {result.status === "masked" && (
          <>
            <div className="chat-exchange__section">
              <span className="chat-exchange__section-label">마스킹되어 전달된 입력</span>
              <p className="chat-exchange__masked-text">{result.maskedPrompt}</p>
            </div>
            <div className="chat-exchange__section chat-exchange__section--divider">
              <span className="chat-exchange__section-label">LLM 응답</span>
              <ResponseBody text={result.response} />
            </div>
          </>
        )}

        {result.status === "pass" && <ResponseBody text={result.response} />}

        {result.detections?.length > 0 && (
          <div className="chat-exchange__section chat-exchange__section--divider">
            <span className="chat-exchange__section-label">탐지 항목</span>
            <div className="chat-exchange__detections">
              {result.detections.map((d, i) => (
                <span key={i} className="chat-exchange__detection-tag">
                  {d.type}: {d.value}
                  {d.origin?.startsWith("file:") && (
                    <span className="chat-exchange__detection-origin">{d.origin.slice(5)}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ResponseBody({ text }) {
  return (
    <div className="chat-exchange__response">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

function ChatError({ prompt, files, message }) {
  return (
    <div className="chat-exchange">
      <PromptBubble prompt={prompt} files={files} />
      <Card className="chat-exchange__result">
        <p className="chat-exchange__block-reason">{message}</p>
      </Card>
    </div>
  );
}
