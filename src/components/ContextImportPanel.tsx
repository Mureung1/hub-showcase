import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import styles from "./ContextImportPanel.module.css";

export type ContextImportProvider = "kakaotalk" | "teams" | "notion" | "paste";

export type ContextImportInput = {
  provider: ContextImportProvider;
  title?: string;
  text: string;
};

export type ContextImportPanelProps = {
  onImport: (input: ContextImportInput) => Promise<void>;
};

export const CONTEXT_IMPORT_FILE_LIMIT_BYTES = 256 * 1024;

type ImportStatus = "idle" | "reading" | "pending" | "success" | "error";

const providerOptions: Array<{
  id: ContextImportProvider;
  label: string;
  description: string;
  format: string;
}> = [
  {
    id: "kakaotalk",
    label: "카카오톡 내보내기",
    description: "대화방에서 내보낸 대화 내용을 가져옵니다.",
    format: "TXT",
  },
  {
    id: "teams",
    label: "Teams JSON",
    description: "내보낸 채팅 또는 회의 기록을 가져옵니다.",
    format: "JSON",
  },
  {
    id: "notion",
    label: "Notion JSON",
    description: "내보낸 페이지와 블록 내용을 가져옵니다.",
    format: "JSON",
  },
  {
    id: "paste",
    label: "직접 붙여넣기",
    description: "어디서든 복사한 회의 맥락을 바로 붙여넣습니다.",
    format: "TEXT",
  },
];

const providerSamples: Record<ContextImportProvider, { title: string; text: string }> = {
  kakaotalk: {
    title: "카카오톡 제품 방향 회의",
    text: `--------------- 2026년 7월 11일 토요일 ---------------
[민지] [오후 2:01] 다음 주에 사용자 5명을 대상으로 시안을 검증하면 좋겠습니다.
[서준] [오후 2:03] 금요일까지 프로토타입을 완성하고 근거 링크도 함께 정리하겠습니다.
[민지] [오후 2:05] 결정: 첫 테스트는 계정 연동 없이 내보낸 기록으로 진행합니다.
[서준] [오후 2:07] 질문: 테스트 결과를 어떤 기준으로 다음 회의에서 비교할까요?`,
  },
  teams: {
    title: "Teams 주간 제품 회의",
    text: JSON.stringify([
      {
        id: "teams-demo-1",
        createdDateTime: "2026-07-11T05:01:00Z",
        from: { user: { displayName: "민지" } },
        body: { contentType: "html", content: "<p>이번 주에는 검색 결과의 근거 표시를 검증하겠습니다.</p>" },
        webUrl: "https://teams.microsoft.com/l/message/teams-demo-1",
      },
      {
        id: "teams-demo-2",
        createdDateTime: "2026-07-11T05:03:00Z",
        from: { user: { displayName: "서준" } },
        body: { contentType: "text", content: "결정: 금요일까지 백링크 화면을 공개 데모에 반영합니다." },
      },
    ], null, 2),
  },
  notion: {
    title: "Notion 회의 정리",
    text: JSON.stringify({
      page: {
        id: "notion-demo-page",
        url: "https://www.notion.so/notion-demo-page",
        properties: { Name: { type: "title", title: [{ plain_text: "회의 정리" }] } },
      },
      blocks: [
        { id: "block-1", type: "heading_2", heading_2: { rich_text: [{ plain_text: "결정사항" }] } },
        { id: "block-2", type: "paragraph", paragraph: { rich_text: [{ plain_text: "원문 인용과 지식맵을 같은 화면에서 확인한다." }] } },
        { id: "block-3", type: "to_do", to_do: { rich_text: [{ plain_text: "다음 회의 전까지 참여자 별칭을 정리한다." }] } },
      ],
    }, null, 2),
  },
  paste: {
    title: "붙여넣은 후속 회의",
    text: "민지는 가져온 회의 기록을 한곳에서 검색해야 한다고 제안했다. 서준은 각 결정에서 원문으로 돌아가는 백링크가 필요하다고 말했다. 팀은 카카오톡 내보내기, Teams JSON, Notion JSON을 같은 기록 형식으로 저장하기로 결정했다. 다음 회의에서는 참여자 별칭 병합 기준을 확정해야 한다.",
  },
};

function ContextImportPanel({ onImport }: ContextImportPanelProps) {
  const [provider, setProvider] = useState<ContextImportProvider>("kakaotalk");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileReadVersion = useRef(0);
  const titleId = useId();
  const textId = useId();
  const fileId = useId();
  const privacyId = useId();
  const statusId = useId();

  const busy = status === "reading" || status === "pending";
  const payloadBytes = requestByteLength(provider, title, text);
  const payloadTooLarge = payloadBytes > CONTEXT_IMPORT_FILE_LIMIT_BYTES;
  const canImport = text.trim().length > 0 && !payloadTooLarge && !busy;
  const selectedProvider = providerOptions.find((option) => option.id === provider) ?? providerOptions[0];

  const clearFeedback = () => {
    if (status !== "reading" && status !== "pending") {
      setStatus("idle");
      setMessage("");
    }
  };

  const selectProvider = (nextProvider: ContextImportProvider) => {
    if (busy) return;
    fileReadVersion.current += 1;
    setProvider(nextProvider);
    setTitle("");
    setText("");
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    clearFeedback();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const expectedExtension = provider === "kakaotalk" ? ".txt" : ".json";
    if (!file.name.toLocaleLowerCase("en-US").endsWith(expectedExtension)) {
      setFileName(null);
      setStatus("error");
      setMessage(`${selectedProvider.label}에는 ${expectedExtension} 파일을 선택해 주세요.`);
      event.target.value = "";
      return;
    }

    if (file.size > CONTEXT_IMPORT_FILE_LIMIT_BYTES) {
      setFileName(null);
      setStatus("error");
      setMessage("파일은 256KB 이하만 가져올 수 있습니다.");
      event.target.value = "";
      return;
    }

    const readVersion = fileReadVersion.current + 1;
    fileReadVersion.current = readVersion;
    setStatus("reading");
    setMessage(`${file.name} 파일을 읽는 중…`);

    try {
      const fileText = await readFileText(file);
      if (fileReadVersion.current !== readVersion) return;
      setText(removeByteOrderMark(fileText));
      setFileName(file.name);
      setTitle((current) => current || file.name.replace(/\.[^.]+$/, ""));
      setStatus("idle");
      setMessage("");
    } catch {
      if (fileReadVersion.current !== readVersion) return;
      setFileName(null);
      setStatus("error");
      setMessage("파일을 읽지 못했습니다. 다시 선택해 주세요.");
      event.target.value = "";
    }
  };

  const submitImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canImport) return;

    setStatus("pending");
    setMessage("선택한 맥락을 정리해 가져오는 중…");
    try {
      const trimmedTitle = title.trim();
      await onImport({
        provider,
        ...(trimmedTitle ? { title: trimmedTitle } : {}),
        text: text.trim(),
      });
      setStatus("success");
      setMessage("맥락을 가져왔습니다. 이제 다른 기록과 함께 분석할 수 있습니다.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error && error.message
        ? error.message
        : "맥락을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const loadSample = () => {
    if (busy) return;
    const sample = providerSamples[provider];
    setTitle(sample.title);
    setText(sample.text);
    setFileName(null);
    setStatus("idle");
    setMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <section className={styles.panel} aria-labelledby={`${titleId}-heading`} aria-busy={busy}>
      <div className={styles.headingRow}>
        <div className={styles.heading}>
          <p className={styles.kicker}>External context</p>
          <h2 id={`${titleId}-heading`}>다른 곳의 회의 맥락 가져오기</h2>
          <p>내보낸 기록을 한곳에 모아 연결된 지식처럼 정리합니다.</p>
        </div>
        <span className={styles.noLinkBadge}>계정 연결 없음</span>
      </div>

      <form className={styles.form} onSubmit={submitImport}>
        <fieldset className={styles.providerFieldset} disabled={busy}>
          <legend>가져올 곳</legend>
          <div className={styles.providerGrid}>
            {providerOptions.map((option) => (
              <label
                aria-label={option.label}
                className={`${styles.providerOption} ${provider === option.id ? styles.selectedProvider : ""}`}
                htmlFor={`${titleId}-provider-${option.id}`}
                key={option.id}
              >
                <input
                  id={`${titleId}-provider-${option.id}`}
                  type="radio"
                  name={`${titleId}-provider`}
                  value={option.id}
                  checked={provider === option.id}
                  onChange={() => selectProvider(option.id)}
                />
                <span className={styles.providerCopy}>
                  <span className={styles.providerTitleRow}>
                    <strong>{option.label}</strong>
                    <small>{option.format}</small>
                  </span>
                  <span>{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.field}>
          <label htmlFor={titleId}>기록 제목 <small>선택</small></label>
          <input
            id={titleId}
            className={styles.textInput}
            type="text"
            value={title}
            maxLength={120}
            disabled={busy}
            placeholder="예: 7월 제품 방향 회의"
            onChange={(event) => {
              setTitle(event.target.value);
              clearFeedback();
            }}
          />
        </div>

        {provider !== "paste" && (
          <div className={styles.field}>
            <label htmlFor={fileId}>내보내기 파일</label>
            <input
              ref={fileInputRef}
              id={fileId}
              className={styles.fileInput}
              type="file"
              accept={provider === "kakaotalk" ? ".txt,text/plain" : ".json,application/json"}
              disabled={busy}
              aria-describedby={`${fileId}-guide ${privacyId}`}
              onChange={(event) => void handleFileChange(event)}
            />
            <small id={`${fileId}-guide`} className={styles.guide}>
              {selectedProvider.format} · 최대 256KB{fileName ? ` · 선택됨: ${fileName}` : ""}
            </small>
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor={textId}>{provider === "paste" ? "회의 맥락 붙여넣기" : "가져올 내용 확인"}</label>
          <textarea
            id={textId}
            className={styles.textarea}
            value={text}
            disabled={busy}
            aria-invalid={payloadTooLarge || undefined}
            aria-describedby={`${textId}-counter ${privacyId}`}
            placeholder={provider === "paste"
              ? "카카오톡, Teams, Notion 등에서 필요한 대화와 회의 내용을 복사해 붙여넣으세요."
              : "파일을 선택하면 내용이 여기에 표시됩니다. 직접 붙여넣거나 필요한 부분만 다듬어도 됩니다."}
            onChange={(event) => {
              setText(event.target.value);
              clearFeedback();
            }}
          />
          <small
            id={`${textId}-counter`}
            className={`${styles.counter} ${payloadTooLarge ? styles.counterError : ""}`}
            aria-live="polite"
          >
            요청 {formatBytes(payloadBytes)} / 256KB{payloadTooLarge ? " · 허용 크기를 초과했습니다." : ""}
          </small>
        </div>

        <div id={privacyId} className={styles.privacyNote}>
          <strong>내 계정과 연동하지 않습니다.</strong>
          <span>카카오·Microsoft·Notion 로그인을 요구하지 않으며, 여기서 직접 선택한 파일과 붙여넣은 내용만 가져옵니다. 민감정보는 먼저 제거해 주세요.</span>
        </div>

        {status !== "idle" && (
          <p
            id={statusId}
            className={`${styles.status} ${styles[status]}`}
            role={status === "error" ? "alert" : "status"}
            aria-live={status === "error" ? "assertive" : "polite"}
          >
            {message}
          </p>
        )}

        <div className={styles.actions}>
          <span>원본 형식은 유지하고, 저장 단계에서 공통 기록으로 변환합니다.</span>
          <div className={styles.actionButtons}>
            <button
              className={styles.sampleButton}
              type="button"
              disabled={busy}
              onClick={loadSample}
            >
              샘플 불러오기
            </button>
            <button
              className={styles.importButton}
              type="submit"
              disabled={!canImport}
              aria-describedby={`${privacyId}${status !== "idle" ? ` ${statusId}` : ""}`}
            >
              {status === "pending" ? "가져오는 중…" : "파싱하고 가져오기"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function requestByteLength(
  provider: ContextImportProvider,
  title: string,
  text: string,
) {
  return byteLength(JSON.stringify({
    provider,
    ...(title.trim() ? { title: title.trim() } : {}),
    text: text.trim(),
  }));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes.toLocaleString("ko-KR")}B`;
  return `${(bytes / 1024).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}KB`;
}

function removeByteOrderMark(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function readFileText(file: File) {
  if (typeof file.text === "function") return file.text();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(typeof reader.result === "string" ? reader.result : ""));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(file);
  });
}

export default ContextImportPanel;
