import { useRef, useState } from "react";

const VALID_EXT = /\.(md|markdown|txt)$/i;

// 1단계: CV 업로드/붙여넣기 + 실시간 파싱 미리보기
// 예외 처리: 지원하지 않는 파일 형식 안내, 파싱 빈약 시 힌트.
export default function CvUpload({ text, onText, parsed, samples = [] }) {
  const fileRef = useRef(null);
  const [fileError, setFileError] = useState("");

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!VALID_EXT.test(file.name)) {
      setFileError(`지원하지 않는 형식이에요: ${file.name} — .md / .markdown / .txt 만 가능`);
      e.target.value = "";
      return;
    }
    setFileError("");
    const reader = new FileReader();
    reader.onload = () => onText(String(reader.result || ""));
    reader.readAsText(file);
  }

  function loadSample(md) {
    setFileError("");
    onText(md);
  }

  const filled = text.trim().length > 0;
  const itemCount =
    parsed.skills.length +
    parsed.experience.length +
    parsed.projects.length +
    parsed.education.length;
  const noName = filled && !parsed.name;
  const sparse = filled && itemCount === 0;

  return (
    <div className="cv-grid">
      <div className="cv-input">
        <label className="cv-label" htmlFor="cv-textarea">
          이력서 (마크다운)
        </label>
        <div className="cv-toolbar">
          <button className="btn" onClick={() => fileRef.current && fileRef.current.click()}>
            📄 파일 업로드
          </button>
          {samples.map((s) => (
            <button key={s.label} className="btn ghost" onClick={() => loadSample(s.md)}>
              {s.label}
            </button>
          ))}
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,.txt,text/plain,text/markdown"
            onChange={onFile}
            hidden
          />
        </div>
        {fileError && (
          <p className="cv-error" role="alert">
            ⚠️ {fileError}
          </p>
        )}
        <textarea
          id="cv-textarea"
          className="cv-textarea"
          placeholder={
            "마크다운 이력서를 붙여넣으세요.\n\n# 홍길동\nMarketing Manager\nhong@example.com · 서울\n\n## Summary\n...\n\n## Skills\n퍼포먼스 마케팅, GA4, ...\n\n## Experience\n### 회사 — 역할 (2022 - 현재)\n- 성과..."
          }
          value={text}
          onChange={(e) => onText(e.target.value)}
          spellCheck={false}
        />
      </div>

      <aside className="cv-preview">
        <h3>파싱 미리보기</h3>
        {!filled ? (
          <p className="muted">이력서를 입력하면 구조가 여기에 표시됩니다.</p>
        ) : (
          <div className="parsed">
            <p className="parsed-name">{parsed.name || "이름 없음"}</p>
            <p className="parsed-title">{parsed.title || "-"}</p>
            {parsed.contacts.length > 0 && (
              <ul className="parsed-contacts">
                {parsed.contacts.map((c) => (
                  <li key={c.value}>
                    <span className="chip">{c.type}</span> {c.value}
                  </li>
                ))}
              </ul>
            )}
            <dl className="parsed-stats">
              <div><dt>기술</dt><dd>{parsed.skills.length}</dd></div>
              <div><dt>경력</dt><dd>{parsed.experience.length}</dd></div>
              <div><dt>프로젝트</dt><dd>{parsed.projects.length}</dd></div>
              <div><dt>학력</dt><dd>{parsed.education.length}</dd></div>
            </dl>
            {(noName || sparse) && (
              <p className="parse-hint" role="status">
                {noName
                  ? "이름을 못 찾았어요 — 첫 줄을 “# 이름” 형식으로 써보세요."
                  : "인식된 항목이 적어요."}{" "}
                원문은 그대로 보존되니 생성은 계속할 수 있어요.
              </p>
            )}
            {parsed.summary && <p className="parsed-summary">{parsed.summary}</p>}
          </div>
        )}
      </aside>
    </div>
  );
}
