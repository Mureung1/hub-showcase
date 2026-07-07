import { useRef } from "react";

// 1단계: CV 업로드/붙여넣기 + 실시간 파싱 미리보기
export default function CvUpload({ text, onText, parsed, samples = [] }) {
  const fileRef = useRef(null);

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onText(String(reader.result || ""));
    reader.readAsText(file);
  }

  const filled = text.trim().length > 0;

  return (
    <div className="cv-grid">
      <div className="cv-input">
        <div className="cv-toolbar">
          <button className="btn" onClick={() => fileRef.current && fileRef.current.click()}>
            📄 파일 업로드
          </button>
          {samples.map((s) => (
            <button key={s.label} className="btn ghost" onClick={() => onText(s.md)}>
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
        <textarea
          className="cv-textarea"
          placeholder={
            "마크다운 이력서를 붙여넣으세요.\n\n# 홍길동\nFrontend Engineer\nhong@example.com · github.com/hong · 서울\n\n## Summary\n...\n\n## Skills\nReact, TypeScript, ...\n\n## Experience\n### 회사 — 역할 (2022 - 현재)\n- 성과..."
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
            {parsed.summary && <p className="parsed-summary">{parsed.summary}</p>}
          </div>
        )}
      </aside>
    </div>
  );
}
