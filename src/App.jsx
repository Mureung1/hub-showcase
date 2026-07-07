import { useEffect, useMemo, useState } from "react";
import {
  SAMPLE_KNOWN_URLS,
  SAMPLE_NOTICE_SITE,
  buildKnownLinkKey,
  findNewPostLinks,
  resolveTargetUrl,
  runNoticeLinkScan,
  sampleNoticeHtml,
} from "./agents/noticeLinkAgent.js";

const sourceOptions = [
  { id: "sample", label: "샘플 HTML" },
  { id: "live", label: "실제 웹페이지" },
];

const statusLabels = {
  idle: "준비",
  running: "스캔 중",
  complete: "완료",
  error: "확인 필요",
};

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function defaultKnownLinks(targetUrl) {
  return resolveTargetUrl(targetUrl) === SAMPLE_NOTICE_SITE.url ? SAMPLE_KNOWN_URLS : [];
}

function readKnownLinks(targetUrl) {
  try {
    const rawValue = window.localStorage.getItem(buildKnownLinkKey(targetUrl));

    if (!rawValue) {
      return defaultKnownLinks(targetUrl);
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : defaultKnownLinks(targetUrl);
  } catch {
    return defaultKnownLinks(targetUrl);
  }
}

function saveKnownLinks(targetUrl, urls) {
  try {
    window.localStorage.setItem(buildKnownLinkKey(targetUrl), JSON.stringify(urls));
  } catch {
    // Local storage is best-effort in this prototype.
  }
}

function formatScanTime(value) {
  if (!value) {
    return "아직 없음";
  }

  return timeFormatter.format(new Date(value));
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return "스캔 중 오류가 발생했습니다.";
}

export default function OpportunityAgentWorkbench() {
  const [targetUrl, setTargetUrl] = useState(SAMPLE_NOTICE_SITE.url);
  const [linkSelector, setLinkSelector] = useState(SAMPLE_NOTICE_SITE.linkSelector);
  const [sourceMode, setSourceMode] = useState("sample");
  const [htmlSource, setHtmlSource] = useState(sampleNoticeHtml);
  const [knownLinks, setKnownLinks] = useState(() => readKnownLinks(SAMPLE_NOTICE_SITE.url));
  const [scan, setScan] = useState(null);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const resolvedTargetUrl = resolveTargetUrl(targetUrl);
  const isRunning = status === "running";

  const pipelineSteps = useMemo(
    () => [
      {
        copy: resolvedTargetUrl || "URL 대기",
        state: resolvedTargetUrl ? "done" : "idle",
        title: "대상 확인",
      },
      {
        copy: sourceMode === "live" ? "웹페이지 HTML 요청" : "로컬 HTML 사용",
        state: isRunning ? "active" : scan ? "done" : "idle",
        title: "HTML 수집",
      },
      {
        copy: `${scan?.allLinks.length ?? 0}개 발견`,
        state: scan ? "done" : "idle",
        title: "링크 추출",
      },
      {
        copy: `${scan?.newLinks.length ?? 0}개 남김`,
        state: scan ? "done" : "idle",
        title: "신규 필터",
      },
      {
        copy: "공지 요약 확장 슬롯",
        state: "queued",
        title: "요약 대기",
      },
    ],
    [isRunning, resolvedTargetUrl, scan, sourceMode],
  );

  const metrics = useMemo(
    () => [
      { label: "추출 링크", value: scan?.allLinks.length ?? 0 },
      { label: "새 링크", value: scan?.newLinks.length ?? 0 },
      { label: "기존 기록", value: knownLinks.length },
      { label: "마지막 스캔", value: formatScanTime(scan?.fetchedAt) },
    ],
    [knownLinks.length, scan],
  );

  useEffect(() => {
    let isCancelled = false;

    async function runInitialScan() {
      setStatus("running");

      try {
        const result = await runNoticeLinkScan({
          html: sampleNoticeHtml,
          knownUrls: readKnownLinks(SAMPLE_NOTICE_SITE.url),
          linkSelector: SAMPLE_NOTICE_SITE.linkSelector,
          sourceMode: "sample",
          targetUrl: SAMPLE_NOTICE_SITE.url,
        });

        if (!isCancelled) {
          setScan(result);
          setStatus("complete");
          setErrorMessage("");
        }
      } catch (error) {
        if (!isCancelled) {
          setStatus("error");
          setErrorMessage(getErrorMessage(error));
        }
      }
    }

    runInitialScan();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    setKnownLinks(readKnownLinks(targetUrl));
  }, [targetUrl]);

  async function handleRunScan(event) {
    event.preventDefault();
    setStatus("running");
    setErrorMessage("");

    try {
      const result = await runNoticeLinkScan({
        html: htmlSource,
        knownUrls: knownLinks,
        linkSelector,
        sourceMode,
        targetUrl,
      });

      setScan(result);
      setStatus("complete");
    } catch (error) {
      setStatus("error");
      setErrorMessage(getErrorMessage(error));
    }
  }

  function handleSaveCurrentLinks() {
    if (!scan) {
      return;
    }

    const nextKnownLinks = Array.from(
      new Set([...knownLinks, ...scan.allLinks.map((link) => link.url)]),
    );

    saveKnownLinks(scan.targetUrl, nextKnownLinks);
    setKnownLinks(nextKnownLinks);
    setScan({
      ...scan,
      knownCount: nextKnownLinks.length,
      newLinks: findNewPostLinks(scan.allLinks, nextKnownLinks, scan.targetUrl),
    });
  }

  function handleResetKnownLinks() {
    saveKnownLinks(targetUrl, []);
    setKnownLinks([]);

    if (scan && scan.targetUrl === resolvedTargetUrl) {
      setScan({
        ...scan,
        knownCount: 0,
        newLinks: scan.allLinks,
      });
    }
  }

  return (
    <main className="agent-page">
      <section className="workspace" aria-labelledby="agent-title">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Opportunity Agent</p>
            <h1 id="agent-title">공지 링크 수집 에이전트</h1>
          </div>
          <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
        </header>

        <section className="tool-grid" aria-label="스캔 설정">
          <form className="scan-panel" onSubmit={handleRunScan}>
            <div className="field-row">
              <label className="field field-wide">
                <span>대상 웹사이트</span>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(event) => setTargetUrl(event.target.value)}
                  placeholder="https://example.ac.kr/notice"
                />
              </label>

              <label className="field">
                <span>링크 선택자</span>
                <input
                  type="text"
                  value={linkSelector}
                  onChange={(event) => setLinkSelector(event.target.value)}
                  placeholder="a[href]"
                />
              </label>
            </div>

            <div className="segmented-control" role="group" aria-label="소스 선택">
              {sourceOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={sourceMode === option.id ? "is-active" : ""}
                  onClick={() => setSourceMode(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="field html-field">
              <span>HTML 소스</span>
              <textarea
                value={htmlSource}
                disabled={sourceMode === "live"}
                onChange={(event) => setHtmlSource(event.target.value)}
                spellCheck="false"
              />
            </label>

            <div className="action-row">
              <button className="primary-button" type="submit" disabled={isRunning}>
                {isRunning ? "스캔 중" : "스캔 실행"}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={handleSaveCurrentLinks}
                disabled={!scan || isRunning}
              >
                현재 결과 저장
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={handleResetKnownLinks}
                disabled={isRunning}
              >
                기록 초기화
              </button>
            </div>

            {errorMessage ? (
              <p className="error-message" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </form>

          <aside className="pipeline-panel" aria-label="에이전트 처리 흐름">
            <div className="panel-heading">
              <p className="eyebrow">Agent Flow</p>
              <h2>처리 흐름</h2>
            </div>
            <ol className="pipeline-list">
              {pipelineSteps.map((step, index) => (
                <li key={step.title} className={`pipeline-step step-${step.state}`}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section className="result-section" aria-label="스캔 결과">
          <div className="metrics-row">
            {metrics.map((metric) => (
              <div className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>

          <div className="result-table">
            <header className="result-header">
              <div>
                <p className="eyebrow">New Links</p>
                <h2>새 글 링크</h2>
              </div>
              <span>{scan?.newLinks.length ?? 0}개</span>
            </header>

            <div className="link-list">
              {scan?.newLinks.length ? (
                scan.newLinks.map((link, index) => (
                  <a
                    className="link-row"
                    href={link.url}
                    key={link.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="link-copy">
                      <strong>{link.title}</strong>
                      <small>{link.url}</small>
                    </span>
                    <span className="link-host">{link.hostname}</span>
                  </a>
                ))
              ) : (
                <div className="empty-state">새 글 링크가 없습니다.</div>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
