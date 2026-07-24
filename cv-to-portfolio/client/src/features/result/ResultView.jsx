import { useEffect, useState } from "react";
import PortfolioLibrary from "../portfolio/PortfolioLibrary.jsx";
import "./result.css";

// 4단계: 완성된 포트폴리오 전달.
// 미리보기(iframe) ↔ HTML 코드 탭 + 다운로드 + 다시 만들기 + 디자인만 바꾸기.
export default function ResultView({
  html,
  cv,
  theme,
  jobTarget,
  generation,
  onRestart,
  onChangeDesign,
}) {
  const [tab, setTab] = useState("preview");
  const [copied, setCopied] = useState(false);
  const [current, setCurrent] = useState({ html, cv, theme });

  useEffect(() => {
    setCurrent({ html, cv, theme });
  }, [html, cv, theme]);

  function download() {
    const blob = new Blob([current.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = (current.cv.name || "portfolio").replace(/\s+/g, "_");
    a.href = url;
    a.download = `${safe}_portfolio.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(current.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 권한 없으면 무시 */
    }
  }

  return (
    <div className="result">
      <div className="result-bar">
        <div className="tabs">
          <button
            className={tab === "preview" ? "on" : ""}
            onClick={() => setTab("preview")}
          >
            미리보기
          </button>
          <button className={tab === "code" ? "on" : ""} onClick={() => setTab("code")}>
            HTML 코드
          </button>
        </div>
        <div className="result-actions">
          <span className="result-theme">🎨 {current.theme.name}</span>
          {tab === "code" && (
            <button className="btn" onClick={copyCode}>
              {copied ? "✓ 복사됨" : "코드 복사"}
            </button>
          )}
          <button className="btn primary" onClick={download}>
            ⬇ HTML 다운로드
          </button>
        </div>
      </div>

      {generation?.notice && (
        <p className={`generation-notice ${generation.source}`} role="status">
          {generation.notice}
        </p>
      )}

      <div className="result-target">
        <span>지원 목표</span>
        <strong>
          {jobTarget.company} · {jobTarget.role}
        </strong>
        <a href={jobTarget.sourceUrl} target="_blank" rel="noreferrer">
          공고 확인 ↗
        </a>
      </div>

      {tab === "preview" ? (
        <iframe
          className="preview-frame"
          title="portfolio preview"
          srcDoc={current.html}
        />
      ) : (
        <pre className="code-view">
          <code>{current.html}</code>
        </pre>
      )}

      <PortfolioLibrary
        html={current.html}
        cv={current.cv}
        theme={current.theme}
        onOpen={(portfolio) =>
          setCurrent({
            html: portfolio.html,
            cv: { ...current.cv, name: portfolio.name, title: portfolio.title },
            theme: {
              ...current.theme,
              slug: portfolio.themeSlug,
              name: portfolio.themeName,
            },
          })
        }
      />

      <div className="stage-nav">
        <div className="result-nav-left">
          <button className="btn" onClick={onRestart}>
            ↺ 새로 만들기
          </button>
          {onChangeDesign && (
            <button className="btn ghost" onClick={onChangeDesign}>
              🎨 디자인만 바꾸기
            </button>
          )}
        </div>
        <span className="result-hint">
          다운로드한 <code>.html</code> 파일은 그대로 웹에 올리면 포트폴리오가 됩니다.
        </span>
      </div>
    </div>
  );
}
