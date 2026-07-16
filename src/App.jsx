import { useCallback, useEffect, useMemo, useState } from "react";
import ProfileForm from "./components/ProfileForm.jsx";
import NoticeDiscovery from "./components/NoticeDiscovery.jsx";
import { getHealth, getSavedOpportunities, saveOpportunity } from "./api.js";
import {
  ANALYSIS_MODE_LABELS,
  ANALYSIS_RAW_TEXT_MAX_LENGTH,
  ANALYSIS_RAW_TEXT_MIN_LENGTH,
  CATEGORY_LABELS,
  MATCH_STATUS_LABELS,
} from "./constants/opportunity.js";
import { analyzeOpportunity } from "./services/analyzeOpportunity.js";
import { analyzeNoticeLinks } from "./services/analyzeNoticeLinks.js";
import { rematchAnalysisResult } from "./services/rematchAnalysisResult.js";
import {
  findNewPostLinks,
  resolveTargetUrl,
  runNoticeLinkScan,
} from "./agents/noticeLinkAgent.js";
import {
  createNoticeBriefsFromLinks,
  getNoticeBriefValue,
  noticeBriefFields,
} from "./agents/noticeBriefAgent.js";
import {
  expansionRoadmap,
  opportunityCategories,
  defaultNoticeSources,
} from "./data/noticeSources.js";
import {
  clearUserProfile,
  createEmptyProfileDraft,
  createUserProfileFromDraft,
  profileToDraft,
  readUserProfile,
  saveUserProfile,
  validateUserProfile,
} from "./storage/profileStore.js";
import {
  mergeNoticeHistory,
  readCustomSources,
  readNoticeHistory,
  readScanSnapshot,
  upsertCustomSource,
  writeNoticeHistory,
  writeScanSnapshot,
} from "./storage/noticeHistoryStore.js";

const resultModes = [
  { id: "latest", label: "최신" },
  { id: "all", label: "전체" },
];

const sourceModes = [
  { id: "manual", label: "HTML 입력" },
  { id: "live", label: "서버 프록시" },
];
const sampleRawText = `2026 AI 소프트웨어 공모전 참가자 모집

대상: 전국 대학교 2학년 이상 재학생. 컴퓨터공학, 인공지능, 소프트웨어 관련 전공자 우대.
접수 마감: 2026년 8월 31일
제출 서류: 참가신청서, 프로젝트 계획서, 재학증명서
활동 지역: 온라인
혜택: 대상 300만원, 우수상 100만원
팀 참가 가능, 개인 참가 가능`;

const providerLabels = {
  gemini: "Gemini",
  mock: "mock",
  openai: "OpenAI",
};

const sidebarItems = ["대시보드", "프로필", "기회 추천", "저장한 공고", "마감 태스크", "설정"];

const statusLabels = {
  analyzing: "분석 중",
  complete: "완료",
  error: "확인 필요",
  idle: "준비",
  running: "스캔 중",
};

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function findSourceByUrl(sources, targetUrl) {
  const resolvedUrl = resolveTargetUrl(targetUrl);
  return sources.find((item) => item.targetUrl === resolvedUrl);
}

function getFallbackSourceName(targetUrl) {
  try {
    return new URL(targetUrl).hostname;
  } catch {
    return "직접 입력";
  }
}

function uniqueSourcesByUrl(sources) {
  const sourceMap = new Map();

  sources.forEach((source) => {
    const targetUrl = resolveTargetUrl(source.targetUrl);

    if (!targetUrl) {
      return;
    }

    sourceMap.set(targetUrl, {
      ...source,
      targetUrl,
    });
  });

  return Array.from(sourceMap.values());
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


function createInitialConfig() {
  return {
    htmlSource: "",
    linkSelector: "a[href]",
    selectedSourceId: "custom",
    sourceMode: "live",
    sourceName: "",
    targetUrl: "",
  };
}

function annotateLinks(links, source) {
  return links.map((link) => ({
    ...link,
    id: `${source.id}:${link.url}`,
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.targetUrl,
  }));
}

function createScanSummary(sourceResults, failedSources = []) {
  return {
    allLinks: sourceResults.flatMap((result) => result.allLinks),
    failedSources,
    fetchedAt: new Date().toISOString(),
    isBatch: sourceResults.length > 1 || failedSources.length > 0,
    knownCount: sourceResults.reduce((sum, result) => sum + result.knownCount, 0),
    latestLinks: sourceResults.flatMap((result) => result.latestLinks),
    newLinks: sourceResults.flatMap((result) => result.newLinks),
    previousScanCount: sourceResults.reduce((sum, result) => sum + result.previousScanCount, 0),
    sourceCount: sourceResults.length,
    sourceResults,
    sourceMode: "batch",
    targetUrl: sourceResults[0]?.targetUrl ?? "batch",
  };
}

function AnalysisListSection({ items, title }) {
  if (!items.length) {
    return null;
  }

  return (
    <section>
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function AnalysisResultCard({ canSave, isSaving, onSave, result, saveError, saveMessage }) {
  const opportunity = result.opportunity;
  const match = result.match;
  const isProfilelessAnalysis = match.score === null &&
    match.missingInfo.includes("사용자 프로필") &&
    match.matchedReasons.length === 0 &&
    match.disqualifyingReasons.length === 0;
  const fallbackMessage = result.fallbackUsed
    ? result.fallbackReason?.includes("요청 실패")
      ? "실제 API 호출에 실패하여 mock 결과를 표시합니다."
      : "실제 API가 비활성화되어 mock 결과를 표시합니다."
    : "";
  const fields = [
    { label: "주최 기관", value: opportunity.organizer || "확인 필요" },
    { label: "카테고리", value: CATEGORY_LABELS[opportunity.category] },
    { label: "마감일", value: opportunity.deadline || "마감일 확인 필요" },
    { label: "지원 대상", value: opportunity.target || "확인 필요" },
    ...(opportunity.activityPeriod ? [{ label: "활동 기간", value: opportunity.activityPeriod }] : []),
  ];
  const listSections = [
    { title: "충족한 조건", items: match.matchedReasons },
    { title: "부족한 정보", items: match.missingInfo },
    { title: "지원 불가 이유", items: match.disqualifyingReasons },
    {
      title: "지원 조건 근거",
      items: opportunity.eligibility.map((item) => (
        item.evidence && item.evidence !== item.condition
          ? `${item.condition} (근거: ${item.evidence})`
          : item.condition
      )),
    },
    {
      title: "우대 조건",
      items: opportunity.preferred.map((item) => (
        item.evidence && item.evidence !== item.condition
          ? `${item.condition} (근거: ${item.evidence})`
          : item.condition
      )),
    },
    { title: "필요 서류", items: opportunity.requiredDocuments },
    { title: "혜택", items: opportunity.benefits },
    { title: "다음 행동", items: match.nextActions },
    {
      title: "준비 태스크",
      items: result.tasks.map((task) => task.dueDate ? `${task.title} (${task.dueDate})` : task.title),
    },
  ];

  return (
    <div className="analysis-result">
      <div className="analysis-result-heading">
        <div>
          <p className="eyebrow">Analysis Result</p>
          <h3>{opportunity.title || "공고명 확인 필요"}</h3>
        </div>
        <div className="analysis-result-actions">
          <span className={`analysis-mode mode-${result.mode}`}>
            {result.mode === "gemini" ? "Gemini API 분석" : ANALYSIS_MODE_LABELS[result.mode]}
          </span>
          <button
            className="secondary-button analysis-save-button"
            disabled={isSaving || !canSave}
            onClick={() => onSave(result)}
            title={canSave ? "분석 결과를 Supabase에 저장" : "Supabase 연결 설정 후 저장할 수 있습니다."}
            type="button"
          >
            {isSaving ? "저장 중" : "서버 저장"}
          </button>
          {opportunity.sourceUrl ? (
            <a className="analysis-source-link" href={opportunity.sourceUrl} rel="noreferrer" target="_blank">
              원문 보기
            </a>
          ) : null}
        </div>
      </div>

      {fallbackMessage ? (
        <p className="demo-mode-message">
          {fallbackMessage}
          {result.fallbackReason ? ` (${result.fallbackReason})` : ""}
        </p>
      ) : result.mode === "mock" ? (
        <p className="demo-mode-message">현재 데모 모드입니다. 실제 AI API는 호출되지 않았습니다.</p>
      ) : null}
      {saveMessage ? <p className="notice-message">{saveMessage}</p> : null}
      {saveError ? <p className="notice-message is-error" role="alert">{saveError}</p> : null}

      <div className="analysis-field-grid">
        {fields.map((field) => (
          <div className="analysis-field" key={field.label}>
            <span>{field.label}</span>
            <strong>{field.value}</strong>
          </div>
        ))}
      </div>

      <div className={`match-box match-status-${match.status}`}>
        <div>
          <span>{isProfilelessAnalysis ? "지원 가능성 미판정" : MATCH_STATUS_LABELS[match.status]}</span>
          {match.score !== null ? <strong>{match.score}점</strong> : null}
        </div>
        <p>{match.summary || "분석 요약 확인 필요"}</p>
      </div>

      {opportunity.uncertainFields.length ? (
        <section className="analysis-confirmation">
          <h4>추가 확인 필요</h4>
          <ul>
            {opportunity.uncertainFields.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ) : null}

      <div className="analysis-lists">
        {listSections.map((section) => (
          <AnalysisListSection key={section.title} items={section.items} title={section.title} />
        ))}
      </div>
    </div>
  );
}

function AnalysisDemoPanel({
  analysisError,
  analysisInputMessage,
  analysisRawText,
  analysisResult,
  analysisUrl,
  hasProfile,
  health,
  healthError,
  isAnalyzing,
  isSavingAnalysis,
  onAnalyze,
  onChangeRawText,
  onChangeUrl,
  onSaveAnalysis,
  saveAnalysisError,
  saveAnalysisMessage,
}) {
  const hasOpportunityInput = Boolean(analysisUrl.trim() || analysisRawText.trim());
  const canAnalyze = hasOpportunityInput;
  const analysisState = isAnalyzing
    ? "loading"
    : analysisError
      ? "error"
      : analysisResult
        ? "success"
        : canAnalyze ? "idle" : "insufficient";
  const analysisStateLabels = {
    error: "분석 실패",
    idle: "분석 준비",
    insufficient: "입력 필요",
    loading: "분석 중",
    success: "분석 완료",
  };

  return (
    <section className="analysis-panel" aria-labelledby="analysis-title">
      <header className="analysis-panel-header">
        <div>
          <p className="eyebrow">AI Analysis</p>
          <h2 id="analysis-title">공고 링크/본문 분석</h2>
        </div>
        <div className="analysis-panel-status">
          <span className="analysis-health">
            {health ? `${health.provider ?? health.aiProvider} / live ${String(health.liveAIEnabled ?? health.liveOpenAIEnabled)}` : "server 확인 중"}
          </span>
          <span className={`analysis-state analysis-state-${analysisState}`}>
            {analysisStateLabels[analysisState]}
          </span>
        </div>
      </header>

      <p className="analysis-helper">
        {hasProfile
          ? "저장된 프로필을 기준으로 지원 가능성을 판정합니다. 링크만 입력하면 서버가 본문을 가져옵니다."
          : "프로필 없이도 공고 핵심 정보를 구조화할 수 있습니다. 이 경우 지원 가능성은 판정하지 않습니다."}
      </p>

      {analysisInputMessage ? <p className="analysis-state-message analysis-input-message">{analysisInputMessage}</p> : null}

      <form className="analysis-form" onSubmit={onAnalyze}>
        <label className="field">
          <span>공고 링크</span>
          <input
            type="url"
            value={analysisUrl}
            onChange={(event) => onChangeUrl(event.target.value)}
            placeholder="https://example.com/notice/123"
          />
        </label>

        <label className="field rawtext-field">
          <span>공고 본문 (선택)</span>
          <textarea
            value={analysisRawText}
            onChange={(event) => onChangeRawText(event.target.value)}
            placeholder={sampleRawText}
            spellCheck="false"
          />
        </label>

        <button className="primary-button" type="submit" disabled={isAnalyzing || !canAnalyze}>
          {isAnalyzing ? "분석 중" : hasProfile ? "분석하기" : "공고 정보 구조화"}
        </button>
      </form>

      {healthError ? <p className="notice-message is-error">{healthError}</p> : null}
      {analysisState === "insufficient" ? (
        <p className="analysis-state-message">공고 링크 또는 본문을 입력하면 핵심 정보를 구조화할 수 있습니다.</p>
      ) : null}
      {analysisState === "loading" ? (
        <p className="analysis-state-message" role="status">공고 내용을 분석하고 있습니다.</p>
      ) : null}
      {analysisState === "error" ? (
        <p className="notice-message is-error" role="alert">{analysisError}</p>
      ) : null}
      {analysisState === "success" ? (
        <AnalysisResultCard
          canSave={Boolean(health?.supabaseConfigured)}
          isSaving={isSavingAnalysis}
          onSave={onSaveAnalysis}
          result={analysisResult}
          saveError={saveAnalysisError}
          saveMessage={saveAnalysisMessage}
        />
      ) : null}
    </section>
  );
}

function ConfigPanel({
  activeOperation,
  config,
  errorMessage,
  isRunning,
  noticeMessage,
  onChangeConfig,
  onLoadSource,
  onResetHistory,
  onRunBatchScan,
  onRunScan,
  onRunScanAndAnalyze,
  onSaveLinks,
  onSaveSource,
  scan,
  sourceOptions,
}) {
  return (
    <form className="config-panel" onSubmit={onRunScan}>
      <div className="form-grid">
        <label className="field field-wide">
          <span>대상 웹사이트</span>
          <input
            type="url"
            value={config.targetUrl}
            onChange={(event) => onChangeConfig({ targetUrl: event.target.value })}
            placeholder="https://example.ac.kr/notices"
          />
        </label>

        <label className="field">
          <span>출처 이름</span>
          <input
            type="text"
            value={config.sourceName}
            onChange={(event) => onChangeConfig({ sourceName: event.target.value })}
            placeholder="예: 학교 공지사항"
          />
        </label>
      </div>

      <div className="form-grid source-grid">
        <label className="field">
          <span>저장된 출처</span>
          <select
            value={config.selectedSourceId}
            onChange={(event) => onLoadSource(event.target.value)}
          >
            <option value="custom">직접 입력</option>
            {defaultNoticeSources.length ? (
              <optgroup label="기본 출처">
                {defaultNoticeSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {sourceOptions.length > defaultNoticeSources.length ? (
              <optgroup label="내 출처">
                {sourceOptions
                  .filter((source) => source.id.startsWith("custom:"))
                  .map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
              </optgroup>
            ) : null}
          </select>
        </label>

        <label className="field">
          <span>링크 선택자</span>
          <input
            type="text"
            value={config.linkSelector}
            onChange={(event) => onChangeConfig({ linkSelector: event.target.value })}
            placeholder="a[href]"
          />
        </label>
      </div>

      <div className="segmented-control source-mode-control" role="group" aria-label="HTML 소스 선택">
        {sourceModes.map((mode) => (
          <button
            type="button"
            key={mode.id}
            className={config.sourceMode === mode.id ? "is-active" : ""}
            onClick={() => onChangeConfig({ sourceMode: mode.id })}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <label className="field html-field">
        <span>HTML 소스</span>
        <textarea
          value={config.htmlSource}
          disabled={config.sourceMode === "live"}
          onChange={(event) => onChangeConfig({ htmlSource: event.target.value })}
          spellCheck="false"
        />
      </label>

      <div className="action-row">
        <button className="primary-button" type="submit" disabled={isRunning}>
          {activeOperation === "scan" ? "스캔 중" : "스캔 실행"}
        </button>
        <button
          className="secondary-button scan-analysis-button"
          type="button"
          onClick={onRunScanAndAnalyze}
          disabled={isRunning}
        >
          {activeOperation === "scan-analysis" ? "스캔 및 분석 중" : "스캔 및 분석 실행"}
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={onRunBatchScan}
          disabled={isRunning || !sourceOptions.length}
        >
          저장된 출처 모두 스캔
        </button>
        <button className="secondary-button" type="button" onClick={onSaveSource} disabled={isRunning}>
          출처 저장
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={onSaveLinks}
          disabled={!scan || isRunning}
        >
          현재 결과 저장
        </button>
        <button className="ghost-button" type="button" onClick={onResetHistory} disabled={isRunning}>
          기록 초기화
        </button>
      </div>

      {errorMessage ? (
        <p className="notice-message is-error" role="alert">
          {errorMessage}
        </p>
      ) : (
        <p className="notice-message">{noticeMessage}</p>
      )}
    </form>
  );
}

function PipelinePanel({ config, isRunning, scan }) {
  const resolvedUrl = resolveTargetUrl(config.targetUrl);
  const isBatch = scan?.isBatch;
  const steps = [
    {
      copy: isBatch ? `${scan.sourceCount}개 저장 출처` : config.sourceName || resolvedUrl || "출처 대기",
      state: resolvedUrl || isBatch ? "done" : "idle",
      title: "출처 설정",
    },
    {
      copy: isBatch ? "저장된 출처 일괄 요청" : config.sourceMode === "live" ? "서버 프록시 요청" : "입력 HTML 사용",
      state: isRunning ? "active" : scan ? "done" : "idle",
      title: "HTML 확보",
    },
    {
      copy: `${scan?.allLinks.length ?? 0}개 발견`,
      state: scan ? "done" : "idle",
      title: "링크 추출",
    },
    {
      copy: `${scan?.latestLinks.length ?? 0}개 남김`,
      state: scan ? "done" : "idle",
      title: "최신 필터",
    },
  ];

  return (
    <aside className="pipeline-panel" aria-label="에이전트 처리 흐름">
      <div className="panel-heading">
        <p className="eyebrow">Agent Flow</p>
        <h2>처리 흐름</h2>
      </div>
      <ol className="pipeline-list">
        {steps.map((step, index) => (
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
  );
}

function RoadmapPanel() {
  return (
    <section className="roadmap-section" aria-labelledby="roadmap-title">
      <div className="section-heading compact-heading">
        <p className="eyebrow">Expansion</p>
        <h2 id="roadmap-title">확장 가능한 에이전트 단계</h2>
      </div>
      <div className="roadmap-list">
        {expansionRoadmap.map((item) => (
          <article key={item.id} className={`roadmap-item roadmap-${item.status}`}>
            <span>{item.label}</span>
            <strong>{item.title}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metrics({ knownLinks, scan }) {
  const metrics = [
    { label: "스캔 출처", value: scan?.sourceCount ?? 0 },
    { label: "추출 링크", value: scan?.allLinks.length ?? 0 },
    { label: "최신 링크", value: scan?.latestLinks.length ?? 0 },
    { label: "기존 기록", value: scan?.knownCount ?? knownLinks.length },
    { label: "마지막 스캔", value: formatScanTime(scan?.fetchedAt) },
  ];

  return (
    <div className="metrics-row">
      {metrics.map((metric) => (
        <div className="metric" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ResultTable({
  analysisPendingUrl,
  displayMode,
  failedSources = [],
  isAnalyzing,
  links,
  onAnalyzeLink,
  onChangeMode,
}) {
  const heading = displayMode === "all" ? "전체 공지 링크" : "최신 공지 링크";
  const eyebrow = displayMode === "all" ? "All Notices" : "Latest Since Last Scan";

  return (
    <div className="result-table">
      <header className="result-header result-header-with-mode">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{heading}</h2>
        </div>
        <div className="result-controls">
          <div className="mode-toggle" role="group" aria-label="공지 표시 모드">
            {resultModes.map((mode) => (
              <button
                type="button"
                key={mode.id}
                className={displayMode === mode.id ? "is-active" : ""}
                onClick={() => onChangeMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <span>{links.length}개</span>
        </div>
      </header>

      {failedSources.length ? (
        <div className="scan-warning">
          {failedSources.length}개 출처는 스캔하지 못했습니다: {failedSources.map((item) => item.name).join(", ")}
        </div>
      ) : null}

      <div className="link-list">
        {links.length ? (
          links.map((link, index) => {
            const isCurrentAnalysis = isAnalyzing && analysisPendingUrl === link.url;

            return (
              <article className="link-row" key={`${link.sourceId || link.sourceName || "source"}:${link.id}`}>
                <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
                <a className="link-copy" href={link.url} rel="noreferrer" target="_blank">
                  <strong>{link.title}</strong>
                  <small>{link.url}</small>
                </a>
                <span className="link-host">{link.sourceName || link.hostname}</span>
                <span className="link-actions">
                  <a className="link-action-button is-open" href={link.url} rel="noreferrer" target="_blank">
                    공지 열기
                  </a>
                  <button
                    className={`link-action-button${isCurrentAnalysis ? " is-analyzing" : ""}`}
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => onAnalyzeLink(link)}
                    aria-label={`${link.title} 즉시 분석`}
                    aria-busy={isCurrentAnalysis}
                  >
                    {isCurrentAnalysis ? "분석 중" : "즉시 분석"}
                  </button>
                </span>
              </article>
            );
          })
        ) : (
          <div className="empty-state">표시할 공지 링크가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

function NoticeBriefPanel({ analysisProgress, briefs }) {
  const progressLabel = analysisProgress?.total
    ? analysisProgress.completed < analysisProgress.total
      ? `${analysisProgress.completed}/${analysisProgress.total} 분석 중`
      : `${analysisProgress.total - analysisProgress.failedCount}/${analysisProgress.total} 분석 완료`
    : "";

  return (
    <section className="notice-brief-panel" aria-labelledby="notice-brief-title">
      <header className="result-header result-header-with-mode">
        <div>
          <p className="eyebrow">Structured Notice</p>
          <h2 id="notice-brief-title">공고 정보</h2>
        </div>
        <div className="result-controls">
          {progressLabel ? <span className="notice-analysis-progress" role="status">{progressLabel}</span> : null}
          <span>{briefs.length}개</span>
        </div>
      </header>

      <div className="notice-brief-list">
        {briefs.length ? (
          briefs.map((brief) => (
            <article className={`notice-brief status-${brief.status}`} key={brief.id}>
              <header className="notice-brief-title">
                <div>
                  <strong>{brief.title}</strong>
                  <small>
                    {brief.sourceName}
                    {brief.mode ? ` · ${ANALYSIS_MODE_LABELS[brief.mode]}` : ""}
                  </small>
                </div>
                <span className={`notice-brief-status status-${brief.status}`}>{brief.statusLabel}</span>
              </header>
              {brief.summary ? <p className="notice-brief-summary">{brief.summary}</p> : null}
              {brief.errorMessage ? (
                <p className="notice-brief-error" role="alert">{brief.errorMessage}</p>
              ) : null}
              {brief.uncertainFields.length ? (
                <p className="notice-brief-uncertain">
                  추가 확인 필요: {brief.uncertainFields.join(", ")}
                </p>
              ) : null}
              <dl className="brief-field-grid">
                {noticeBriefFields.map((field) => (
                  <div className="brief-field" key={field.key}>
                    <dt>{field.label}</dt>
                    <dd className={brief.fields[field.key]?.value ? "" : "is-pending"}>
                      {getNoticeBriefValue(brief, field.key)}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))
        ) : (
          <div className="empty-state">최신 공지를 스캔하면 정리 결과가 여기에 표시됩니다.</div>
        )}
      </div>
    </section>
  );
}

function Topbar({ health }) {
  const provider = providerLabels[health?.aiProvider] ?? health?.aiProvider ?? "server";
  const modeLabel = health
    ? health.liveAIEnabled
      ? `${provider} 실제 분석 모드`
      : "mock 분석 모드"
    : "서버 확인 중";

  return (
    <header className="topbar">
      <div className="brand-lockup" aria-label="UniRadar">
        <span className="brand-mark" aria-hidden="true"><span /></span>
        <div>
          <strong>UniRadar</strong>
          <small>대학생 맞춤형 기회 탐색 에이전트</small>
        </div>
      </div>
      <div className="top-search" aria-label="검색">
        <span aria-hidden="true">⌕</span>
        <input placeholder="키워드, 기관명, 공고명으로 검색하세요" />
        <kbd>Ctrl K</kbd>
      </div>
      <div className="topbar-actions">
        <span className={`mode-badge mode-${health?.aiProvider || "mock"}`}>{modeLabel}</span>
        <div className="user-chip" aria-label="사용자">
          <span>김</span>
          <div>
            <strong>김유나</strong>
            <small>학생</small>
          </div>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ status }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <aside className="sidebar" aria-label="주요 메뉴">
      <nav className="sidebar-nav">
        {sidebarItems.map((item, index) => (
          <a
            aria-current={index === activeIndex ? "page" : undefined}
            className={index === activeIndex ? "is-active" : ""}
            href={index === 1 ? "#profile-form" : "#agent-title"}
            key={item}
            onClick={() => setActiveIndex(index)}
          >
            <span aria-hidden="true">{index + 1}</span>
            {item}
          </a>
        ))}
      </nav>
      <div className="sidebar-card">
        <strong>현재 상태</strong>
        <p>{statusLabels[status]}</p>
      </div>
      <div className="sidebar-links">
        <a href="#analysis-title">도움말</a>
        <a href="#notice-brief-title">의견 보내기</a>
      </div>
    </aside>
  );
}

function HeroSummary({ health, knownLinks, scan }) {
  const provider = providerLabels[health?.aiProvider] ?? "mock";
  const metrics = [
    { label: "추출 링크", value: scan?.allLinks.length ?? 0, helper: "이번 스캔" },
    { label: "최신 링크", value: scan?.latestLinks.length ?? 0, helper: "마지막 스캔 이후" },
    { label: "기존 기록", value: scan?.knownCount ?? knownLinks.length, helper: "로컬 저장" },
  ];

  return (
    <section className="hero-summary" aria-label="오늘의 추천 기회 요약">
      <div className="hero-copy">
        <p className="eyebrow">Today</p>
        <h2>오늘의 공지 수집 현황</h2>
        <p>저장한 출처에서 새 글 링크를 찾고, 필요한 공고 본문은 {provider} 분석으로 구조화합니다.</p>
      </div>
      <div className="hero-meta">
        <span>업데이트: {formatScanTime(scan?.fetchedAt)}</span>
      </div>
      <div className="hero-metrics">
        {metrics.map((metric) => (
          <div className="hero-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.helper}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function SavedAnalysisPanel({ errorMessage, isConfigured, isLoading, items, onRefresh, onSelect }) {
  return (
    <section className="saved-analysis-panel" aria-labelledby="saved-analysis-title">
      <div className="saved-analysis-heading">
        <div>
          <p className="eyebrow">Supabase</p>
          <h2 id="saved-analysis-title">서버 저장 공고</h2>
        </div>
        <button
          className="secondary-button compact-button"
          disabled={!isConfigured || isLoading}
          onClick={onRefresh}
          type="button"
        >
          {isLoading ? "불러오는 중" : "새로고침"}
        </button>
      </div>

      {!isConfigured ? (
        <p className="saved-analysis-empty">Supabase 연결을 설정하면 서버에 저장한 공고를 불러올 수 있습니다.</p>
      ) : errorMessage ? (
        <p className="notice-message is-error" role="alert">{errorMessage}</p>
      ) : !items.length ? (
        <p className="saved-analysis-empty">서버에 저장한 공고가 아직 없습니다.</p>
      ) : (
        <ul className="saved-analysis-list">
          {items.map((item) => (
            <li key={item.storageId || item.id}>
              <button onClick={() => onSelect(item)} type="button">
                <span>{CATEGORY_LABELS[item.opportunity.category]}</span>
                <strong>{item.opportunity.title || "공고명 확인 필요"}</strong>
                <small>{item.opportunity.deadline || "마감일 확인 필요"}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProfileSummaryPanel({ onEdit, profile }) {
  if (!profile) {
    return (
      <section className="profile-summary-panel" aria-label="내 프로필 요약">
        <div className="panel-heading compact-heading">
          <p className="eyebrow">Profile</p>
          <h2>내 프로필 요약</h2>
        </div>
        <p className="empty-profile-message">맞춤 추천을 받으려면 먼저 프로필을 입력해 주세요.</p>
        <button className="secondary-button" type="button" onClick={onEdit}>프로필 입력</button>
      </section>
    );
  }

  const fields = [
    { label: "학교", value: profile.school },
    { label: "학년", value: profile.grade ? `${profile.grade}학년` : null },
    { label: "전공", value: profile.majors.join(", ") },
    { label: "관심 분야", value: profile.interests.join(", ") },
    { label: "활동 가능 지역", value: profile.regions.join(", ") },
    { label: "팀 참여", value: profile.canJoinTeam ? "가능" : "불가" },
    { label: "주당 가능 시간", value: profile.availableHoursPerWeek === null ? null : `${profile.availableHoursPerWeek}시간` },
    { label: "학점", value: profile.gpa === null ? null : String(profile.gpa) },
    { label: "소득분위", value: profile.incomeBracket === null ? null : `${profile.incomeBracket}분위` },
    {
      label: "어학성적",
      value: profile.languageScores.length
        ? profile.languageScores.map((score) => `${score.type} ${score.score}`).join(", ")
        : null,
    },
  ].filter((field) => field.value);

  return (
    <section className="profile-summary-panel" aria-label="내 프로필 요약">
      <div className="panel-heading compact-heading summary-heading-with-action">
        <div>
          <p className="eyebrow">Profile</p>
          <h2>내 프로필 요약</h2>
        </div>
        <button className="text-button" type="button" onClick={onEdit}>수정</button>
      </div>
      <div className="profile-summary-grid">
        {fields.map((field) => (
          <div className="profile-summary-item" key={field.label}>
            <span>{field.label}</span>
            <strong>{field.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
function CategoryStrip() {
  return (
    <div className="category-strip" aria-label="향후 정리 대상">
      {opportunityCategories.map((category) => (
        <span key={category}>{category}</span>
      ))}
    </div>
  );
}

export default function OpportunityAgentWorkbench() {
  const [customSources, setCustomSources] = useState(() => readCustomSources());
  const [config, setConfig] = useState(createInitialConfig);
  const [knownLinks, setKnownLinks] = useState([]);
  const [scan, setScan] = useState(null);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("서버 프록시와 로컬 기록으로 공지 링크를 수집합니다.");
  const [displayMode, setDisplayMode] = useState("latest");
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState("");
  const [initialProfileState] = useState(() => {
    const profile = readUserProfile();
    return { profile, draft: profileToDraft(profile) };
  });
  const [userProfile, setUserProfile] = useState(initialProfileState.profile);
  const [profileDraft, setProfileDraft] = useState(initialProfileState.draft);
  const [isProfileEditing, setIsProfileEditing] = useState(!initialProfileState.profile);
  const [profileError, setProfileError] = useState("");
  const [profileSuccessMessage, setProfileSuccessMessage] = useState("");
  const [analysisUrl, setAnalysisUrl] = useState("");
  const [analysisRawText, setAnalysisRawText] = useState("");
  const [analysisInputMessage, setAnalysisInputMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPendingUrl, setAnalysisPendingUrl] = useState(null);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);
  const [saveAnalysisError, setSaveAnalysisError] = useState("");
  const [saveAnalysisMessage, setSaveAnalysisMessage] = useState("");
  const [savedAnalyses, setSavedAnalyses] = useState([]);
  const [savedAnalysesError, setSavedAnalysesError] = useState("");
  const [isLoadingSavedAnalyses, setIsLoadingSavedAnalyses] = useState(false);
  const [activeOperation, setActiveOperation] = useState(null);
  const [noticeAnalysisByUrl, setNoticeAnalysisByUrl] = useState({});
  const [noticeAnalysisProgress, setNoticeAnalysisProgress] = useState(null);

  const isRunning = status === "running" || status === "analyzing";
  const resolvedTargetUrl = resolveTargetUrl(config.targetUrl);
  const sourceOptions = useMemo(() => [...defaultNoticeSources, ...customSources], [customSources]);

  const sourceSummary = useMemo(() => {
    const selectedSource = sourceOptions.find((source) => source.id === config.selectedSourceId);
    return selectedSource?.name || config.sourceName || "직접 입력";
  }, [config.selectedSourceId, config.sourceName, sourceOptions]);

  const displayLinks = useMemo(
    () => (displayMode === "all" ? (scan?.allLinks ?? []) : (scan?.latestLinks ?? [])),
    [displayMode, scan],
  );
  const noticeBriefs = useMemo(
    () => createNoticeBriefsFromLinks(displayLinks, noticeAnalysisByUrl),
    [displayLinks, noticeAnalysisByUrl],
  );
  const loadSavedAnalyses = useCallback(async () => {
    if (!health?.supabaseConfigured) {
      setSavedAnalyses([]);
      setSavedAnalysesError("");
      return;
    }

    setIsLoadingSavedAnalyses(true);
    setSavedAnalysesError("");

    try {
      const response = await getSavedOpportunities();
      setSavedAnalyses(response.items || []);
    } catch (error) {
      setSavedAnalysesError(getErrorMessage(error));
    } finally {
      setIsLoadingSavedAnalyses(false);
    }
  }, [health?.supabaseConfigured]);


  useEffect(() => {
    let isCancelled = false;

    getHealth()
      .then((result) => {
        if (!isCancelled) {
          setHealth(result);
          setHealthError("");
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setHealthError(getErrorMessage(error));
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);
  useEffect(() => {
    loadSavedAnalyses();
  }, [loadSavedAnalyses]);

  useEffect(() => {
    if (!resolveTargetUrl(config.targetUrl)) {
      setKnownLinks([]);
      return;
    }

    const fallbackUrls = findSourceByUrl(sourceOptions, config.targetUrl)?.knownUrls ?? [];
    setKnownLinks(readNoticeHistory(config.targetUrl, fallbackUrls));
  }, [config.targetUrl, sourceOptions]);


  function updateProfileDraft(name, value) {
    setProfileDraft((currentProfile) => ({
      ...currentProfile,
      [name]: value,
    }));
    setProfileError("");
    setProfileSuccessMessage("");
  }

  function rematchStoredNoticeResults(profile) {
    setNoticeAnalysisByUrl((currentEntries) => Object.fromEntries(
      Object.entries(currentEntries).map(([url, entry]) => [
        url,
        entry?.status === "complete" && entry.result
          ? { ...entry, result: rematchAnalysisResult(entry.result, profile) }
          : entry,
      ]),
    ));
  }

  function handleBeginProfileEdit() {
    setIsProfileEditing(true);
    setProfileError("");
    setProfileSuccessMessage("");
    globalThis.document?.getElementById("profile-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCancelProfileEdit() {
    setProfileDraft(profileToDraft(userProfile));
    setIsProfileEditing(false);
    setProfileError("");
    setProfileSuccessMessage("");
  }

  function handleSaveProfile(event) {
    event.preventDefault();
    const candidate = createUserProfileFromDraft(profileDraft, userProfile);
    const validation = validateUserProfile(candidate);

    if (!validation.valid) {
      setProfileError(validation.errors[0]);
      return;
    }

    try {
      const savedProfile = saveUserProfile(candidate);
      setUserProfile(savedProfile);
      setProfileDraft(profileToDraft(savedProfile));
      setIsProfileEditing(false);
      setProfileError("");
      setProfileSuccessMessage("프로필을 저장하고 기존 공고의 지원 가능성을 다시 판정했습니다.");
      setAnalysisResult((currentResult) => rematchAnalysisResult(currentResult, savedProfile));
      rematchStoredNoticeResults(savedProfile);
    } catch (error) {
      setProfileError(getErrorMessage(error));
    }
  }

  function handleResetProfile() {
    clearUserProfile();
    setUserProfile(null);
    setProfileDraft(createEmptyProfileDraft());
    setIsProfileEditing(true);
    setProfileError("");
    setProfileSuccessMessage("프로필을 초기화했습니다.");
    setAnalysisResult((currentResult) => rematchAnalysisResult(currentResult, null));
    rematchStoredNoticeResults(null);
  }

  async function handleSaveAnalysis(result) {
    if (!health?.supabaseConfigured) {
      setSaveAnalysisError("Supabase 저장소가 설정되지 않았습니다. 서버 환경변수를 확인해주세요.");
      return;
    }

    setIsSavingAnalysis(true);
    setSaveAnalysisError("");
    setSaveAnalysisMessage("");

    try {
      const response = await saveOpportunity(result);
      const savedItem = response.item;
      setSavedAnalyses((currentItems) => [
        savedItem,
        ...currentItems.filter((item) => item.id !== savedItem.id),
      ].slice(0, 12));
      setSaveAnalysisMessage("분석 결과를 서버 저장 공고에 반영했습니다.");
    } catch (error) {
      setSaveAnalysisError(getErrorMessage(error));
    } finally {
      setIsSavingAnalysis(false);
    }
  }

  function handleSelectSavedAnalysis(result) {
    setAnalysisResult(result);
    setAnalysisError("");
    setSaveAnalysisError("");
    globalThis.document?.getElementById("analysis-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateAnalysisUrl(value) {
    setAnalysisUrl(value);
    setAnalysisInputMessage("");
    setAnalysisResult(null);
    setAnalysisError("");
    setSaveAnalysisError("");
    setSaveAnalysisMessage("");
  }

  function updateAnalysisRawText(value) {
    setAnalysisRawText(value);
    setAnalysisInputMessage("");
    setAnalysisResult(null);
    setAnalysisError("");
    setSaveAnalysisError("");
    setSaveAnalysisMessage("");
  }

  function handleSelectDiscoveredNotice(candidate) {
    const url = String(candidate?.url ?? "").trim();
    if (!url) {
      setAnalysisError("분석 화면으로 보낼 공지 링크가 없습니다.");
      return;
    }

    setAnalysisUrl(url);
    setAnalysisRawText("");
    setAnalysisResult(null);
    setAnalysisError("");
    setSaveAnalysisError("");
    setSaveAnalysisMessage("");
    setAnalysisInputMessage(
      `"${candidate.title || "선택한 공지"}" 링크를 입력했습니다. 이 출처는 목록 정보만 제공하므로 원문 본문을 붙여넣은 뒤 분석하세요.`,
    );
    globalThis.document?.getElementById("analysis-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleAnalyzeOpportunity(event) {
    event.preventDefault();

    if (isAnalyzing) {
      return;
    }

    const rawText = analysisRawText.trim();
    const url = analysisUrl.trim();

    if (!url && !rawText) {
      setAnalysisError("공고 링크 또는 본문을 입력해 주세요.");
      return;
    }

    if (rawText && rawText.length < ANALYSIS_RAW_TEXT_MIN_LENGTH) {
      setAnalysisError(`공고 본문은 공백을 제외하고 ${ANALYSIS_RAW_TEXT_MIN_LENGTH}자 이상 입력해 주세요.`);
      return;
    }

    if (rawText.length > ANALYSIS_RAW_TEXT_MAX_LENGTH) {
      setAnalysisError(`공고 본문은 ${ANALYSIS_RAW_TEXT_MAX_LENGTH.toLocaleString("ko-KR")}자 이하로 입력해 주세요.`);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisInputMessage("");
    setAnalysisPendingUrl(url || null);
    setAnalysisError("");
    setAnalysisResult(null);

    try {
      const result = await analyzeOpportunity({
        profile: userProfile,
        sourceUrl: url || undefined,
        rawText,
      });

      setAnalysisResult(result);
    } catch (error) {
      setAnalysisError(getErrorMessage(error));
    } finally {
      setIsAnalyzing(false);
      setAnalysisPendingUrl(null);
    }
  }

  async function handleAnalyzeLink(link) {
    if (isAnalyzing || isRunning) {
      return;
    }

    const url = String(link?.url ?? "").trim();
    if (!url) {
      setAnalysisError("분석할 공지 링크가 없습니다.");
      return;
    }

    setAnalysisUrl(url);
    setAnalysisRawText("");
    setAnalysisInputMessage("");

    setIsAnalyzing(true);
    setAnalysisPendingUrl(url);
    setAnalysisError("");
    setAnalysisResult(null);
    setNoticeAnalysisProgress({ completed: 0, failedCount: 0, total: 1 });
    setNoticeAnalysisByUrl((currentEntries) => ({
      ...currentEntries,
      [url]: { link, status: "analyzing" },
    }));
    globalThis.document?.getElementById("analysis-title")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    try {
      const result = await analyzeOpportunity({
        profile: userProfile,
        rawText: "",
        sourceUrl: url,
      });
      setAnalysisResult(result);
      setNoticeAnalysisProgress({ completed: 1, failedCount: 0, total: 1 });
      setNoticeAnalysisByUrl((currentEntries) => ({
        ...currentEntries,
        [url]: { link, result, status: "complete" },
      }));
    } catch (error) {
      const message = getErrorMessage(error);
      setAnalysisError(message);
      setNoticeAnalysisProgress({ completed: 1, failedCount: 1, total: 1 });
      setNoticeAnalysisByUrl((currentEntries) => ({
        ...currentEntries,
        [url]: { errorMessage: message, link, status: "error" },
      }));
    } finally {
      setIsAnalyzing(false);
      setAnalysisPendingUrl(null);
    }
  }

  function updateConfig(partialConfig) {
    setConfig((currentConfig) => ({
      ...currentConfig,
      ...partialConfig,
      selectedSourceId:
        partialConfig.targetUrl && partialConfig.targetUrl !== currentConfig.targetUrl
          ? "custom"
          : (partialConfig.selectedSourceId ?? currentConfig.selectedSourceId),
    }));
    setNoticeMessage("입력값이 변경되었습니다. 스캔하면 새 출처가 자동 저장됩니다.");
  }

  function loadSource(sourceId) {
    if (sourceId === "custom") {
      setConfig((currentConfig) => ({
        ...currentConfig,
        htmlSource: "",
        linkSelector: "a[href]",
        selectedSourceId: "custom",
        sourceMode: "live",
        sourceName: "",
        targetUrl: "",
      }));
      setScan(null);
      setNoticeAnalysisProgress(null);
      setDisplayMode("latest");
      setStatus("idle");
      setErrorMessage("");
      setNoticeMessage("새 출처 이름과 URL을 입력한 뒤 스캔하면 자동 저장됩니다.");
      return;
    }

    const source = sourceOptions.find((item) => item.id === sourceId);

    if (!source) {
      return;
    }

    setConfig({
      htmlSource: source.html ?? "",
      linkSelector: source.linkSelector,
      selectedSourceId: source.id,
      sourceMode: source.sourceMode ?? "manual",
      sourceName: source.name,
      targetUrl: source.targetUrl,
    });
    setScan(null);
    setNoticeAnalysisProgress(null);
    setDisplayMode("latest");
    setStatus("idle");
    setErrorMessage("");
    setNoticeMessage(`${source.name} 출처를 불러왔습니다.`);
  }

  function createSourceFromConfig() {
    const targetUrl = resolveTargetUrl(config.targetUrl);

    if (!targetUrl) {
      throw new Error("대상 웹사이트 URL을 입력해주세요.");
    }

    const savedCustomSource = findSourceByUrl(customSources, targetUrl);
    const savedDefaultSource = findSourceByUrl(defaultNoticeSources, targetUrl);
    const savedSource = savedCustomSource ?? savedDefaultSource;
    const sourceName = config.sourceName.trim() || savedSource?.name || getFallbackSourceName(targetUrl);

    return {
      category: savedSource?.category ?? "직접 추가",
      html: config.sourceMode === "manual" ? config.htmlSource : "",
      id: savedSource?.id ?? `current:${targetUrl}`,
      knownUrls: savedSource?.knownUrls ?? [],
      linkSelector: config.linkSelector || savedSource?.linkSelector || "a[href]",
      name: sourceName,
      sourceMode: config.sourceMode,
      targetUrl,
    };
  }

  function saveSource(source, { silent = false } = {}) {
    const { source: savedSource, sources } = upsertCustomSource(source);

    setCustomSources(sources);
    setConfig((currentConfig) => ({
      ...currentConfig,
      htmlSource: savedSource.html ?? "",
      linkSelector: savedSource.linkSelector,
      selectedSourceId: savedSource.id,
      sourceMode: savedSource.sourceMode,
      sourceName: savedSource.name,
      targetUrl: savedSource.targetUrl,
    }));

    if (!silent) {
      setNoticeMessage(`${savedSource.name} 출처를 저장했습니다.`);
    }

    return savedSource;
  }

  function maybeAutoSaveCurrentSource() {
    const source = createSourceFromConfig();
    const savedDefaultSource = findSourceByUrl(defaultNoticeSources, source.targetUrl);
    const savedCustomSource = findSourceByUrl(customSources, source.targetUrl);
    const shouldAutoSave = Boolean(config.sourceName.trim() && (!savedDefaultSource || savedCustomSource));

    if (!shouldAutoSave) {
      return {
        autoSaved: false,
        source,
      };
    }

    return {
      autoSaved: true,
      source: saveSource(source, { silent: true }),
    };
  }

  function handleSaveSource() {
    setErrorMessage("");

    try {
      saveSource(createSourceFromConfig());
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function scanSource(source) {
    const fallbackUrls = source.knownUrls ?? [];
    const currentKnownLinks = readNoticeHistory(source.targetUrl, fallbackUrls);
    const previousScanLinks = readScanSnapshot(source.targetUrl);
    const result = await runNoticeLinkScan({
      html: source.html ?? "",
      knownUrls: currentKnownLinks,
      linkSelector: source.linkSelector,
      sourceMode: source.sourceMode,
      targetUrl: source.targetUrl,
    });
    const latestLinks = previousScanLinks.length
      ? findNewPostLinks(result.allLinks, previousScanLinks, result.targetUrl)
      : result.allLinks;

    writeScanSnapshot(
      result.targetUrl,
      result.allLinks.map((link) => link.url),
    );

    return {
      ...result,
      allLinks: annotateLinks(result.allLinks, source),
      knownCount: currentKnownLinks.length,
      latestLinks: annotateLinks(latestLinks, source),
      newLinks: annotateLinks(result.newLinks, source),
      previousScanCount: previousScanLinks.length,
      source,
      sourceCount: 1,
      sourceId: source.id,
      sourceName: source.name,
    };
  }

  async function runCurrentSourceScan() {
    const { autoSaved, source } = maybeAutoSaveCurrentSource();
    const result = await scanSource(source);
    const scanWithModes = createScanSummary([result]);
    const nextScan = {
      ...scanWithModes,
      isBatch: false,
      targetUrl: result.targetUrl,
    };

    setKnownLinks(readNoticeHistory(source.targetUrl, source.knownUrls));
    setScan(nextScan);
    setDisplayMode("latest");

    return { autoSaved, result, source };
  }

  async function handleRunScan(event) {
    event.preventDefault();
    setActiveOperation("scan");
    setNoticeAnalysisProgress(null);
    setStatus("running");
    setErrorMessage("");

    try {
      const { autoSaved, result, source } = await runCurrentSourceScan();

      setNoticeMessage(
        `${autoSaved ? "출처를 저장하고 " : ""}${source.name}에서 최신 링크 ${result.latestLinks.length}개를 찾았습니다.`,
      );
      setStatus("complete");
    } catch (error) {
      setStatus("error");
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActiveOperation(null);
    }
  }

  async function handleRunScanAndAnalyze() {
    setActiveOperation("scan-analysis");
    setNoticeAnalysisProgress(null);
    setStatus("running");
    setErrorMessage("");
    setNoticeMessage("최신 공지를 스캔하고 있습니다.");

    try {
      const { autoSaved, result, source } = await runCurrentSourceScan();
      const latestLinks = result.latestLinks;
      const savedMessage = autoSaved ? "출처를 저장하고 " : "";

      if (!latestLinks.length) {
        setNoticeMessage(`${savedMessage}${source.name}에서 새 공지가 없어 분석을 실행하지 않았습니다.`);
        setStatus("complete");
        return;
      }

      setStatus("analyzing");
      setNoticeAnalysisProgress({ completed: 0, failedCount: 0, total: latestLinks.length });
      const summary = await analyzeNoticeLinks({
        links: latestLinks,
        profile: userProfile,
        onProgress: ({ completed, entry, failedCount, total }) => {
          setNoticeAnalysisByUrl((currentEntries) => ({
            ...currentEntries,
            [entry.link.url]: entry,
          }));
          setNoticeAnalysisProgress({ completed, failedCount, total });
          setNoticeMessage(`${source.name} 최신 공지 분석 중: ${completed}/${total}`);
        },
      });

      if (!summary.successCount) {
        setStatus("error");
        setErrorMessage(
          `최신 공지 ${summary.total}개를 찾았지만 분석하지 못했습니다. 공고 정보의 오류 메시지를 확인해주세요.`,
        );
        return;
      }

      setNoticeMessage(
        `${savedMessage}${source.name}에서 최신 링크 ${summary.total}개를 찾고 ${summary.successCount}개를 분석했습니다.` +
          (summary.failedCount ? ` ${summary.failedCount}개는 확인이 필요합니다.` : ""),
      );
      setStatus("complete");
    } catch (error) {
      setStatus("error");
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActiveOperation(null);
    }
  }

  async function handleRunBatchScan() {
    const savedSources = uniqueSourcesByUrl(sourceOptions);

    if (!savedSources.length) {
      setErrorMessage("저장된 출처가 없습니다.");
      return;
    }

    setStatus("running");
    setErrorMessage("");
    setNoticeMessage(`${savedSources.length}개 저장 출처를 스캔하고 있습니다.`);

    const settledResults = await Promise.allSettled(savedSources.map((source) => scanSource(source)));
    const sourceResults = [];
    const failedSources = [];

    settledResults.forEach((result, index) => {
      const source = savedSources[index];

      if (result.status === "fulfilled") {
        sourceResults.push(result.value);
        return;
      }

      failedSources.push({
        id: source.id,
        message: getErrorMessage(result.reason),
        name: source.name,
        targetUrl: source.targetUrl,
      });
    });

    if (!sourceResults.length) {
      setStatus("error");
      setErrorMessage("저장된 출처를 스캔하지 못했습니다.");
      return;
    }

    const scanSummary = createScanSummary(sourceResults, failedSources);
    const fallbackUrls = findSourceByUrl(sourceOptions, config.targetUrl)?.knownUrls ?? [];

    setKnownLinks(readNoticeHistory(config.targetUrl, fallbackUrls));
    setScan(scanSummary);
    setDisplayMode("latest");
    setNoticeMessage(
      `저장된 출처 ${sourceResults.length}개에서 최신 링크 ${scanSummary.latestLinks.length}개를 찾았습니다.` +
        (failedSources.length ? ` ${failedSources.length}개 출처는 확인이 필요합니다.` : ""),
    );
    setStatus("complete");
  }

  function handleSaveLinks() {
    if (!scan) {
      return;
    }

    if (scan.isBatch && scan.sourceResults?.length) {
      const nextKnownCount = scan.sourceResults.reduce((sum, sourceResult) => {
        const nextKnownLinks = mergeNoticeHistory(
          sourceResult.targetUrl,
          readNoticeHistory(sourceResult.targetUrl, sourceResult.source.knownUrls),
          sourceResult.allLinks.map((link) => link.url),
        );

        return sum + nextKnownLinks.length;
      }, 0);
      const fallbackUrls = findSourceByUrl(sourceOptions, config.targetUrl)?.knownUrls ?? [];

      setKnownLinks(readNoticeHistory(config.targetUrl, fallbackUrls));
      setScan({
        ...scan,
        knownCount: nextKnownCount,
      });
      setNoticeMessage("현재 결과를 각 출처의 기존 공지 기록으로 저장했습니다.");
      return;
    }

    const nextKnownLinks = mergeNoticeHistory(
      scan.targetUrl,
      knownLinks,
      scan.allLinks.map((link) => link.url),
    );

    setKnownLinks(nextKnownLinks);
    setScan({
      ...scan,
      knownCount: nextKnownLinks.length,
      newLinks: findNewPostLinks(scan.allLinks, nextKnownLinks, scan.targetUrl),
    });
    setNoticeMessage("현재 결과를 기존 공지 기록으로 저장했습니다.");
  }

  function handleResetHistory() {
    if (!resolvedTargetUrl) {
      setKnownLinks([]);
      return;
    }

    writeNoticeHistory(resolvedTargetUrl, []);
    writeScanSnapshot(resolvedTargetUrl, []);
    setKnownLinks([]);

    if (scan && scan.targetUrl === resolvedTargetUrl) {
      setScan({
        ...scan,
        knownCount: 0,
        latestLinks: scan.allLinks,
        newLinks: scan.allLinks,
        previousScanCount: 0,
      });
      setDisplayMode("latest");
    }
    setNoticeMessage("이 출처의 기존 기록과 마지막 스캔 기준을 초기화했습니다.");
  }

  return (
    <main className="app-shell">
      <Topbar health={health} />
      <div className="app-layout">
        <Sidebar status={status} />
        <section className="workspace" aria-labelledby="agent-title">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Opportunity Agent</p>
            <h1 id="agent-title">공지 링크 수집 워크벤치</h1>
            <CategoryStrip />
          </div>
          <div className="header-status">
            <span className="source-chip">{sourceSummary}</span>
            <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
          </div>
        </header>

        <HeroSummary health={health} knownLinks={knownLinks} scan={scan} />

        <section className="tool-grid" aria-label="스캔 설정과 흐름">
          <ConfigPanel
            activeOperation={activeOperation}
            config={config}
            errorMessage={errorMessage}
            isRunning={isRunning}
            noticeMessage={noticeMessage}
            onChangeConfig={updateConfig}
            onLoadSource={loadSource}
            onResetHistory={handleResetHistory}
            onRunBatchScan={handleRunBatchScan}
            onRunScan={handleRunScan}
            onRunScanAndAnalyze={handleRunScanAndAnalyze}
            onSaveLinks={handleSaveLinks}
            onSaveSource={handleSaveSource}
            scan={scan}
            sourceOptions={sourceOptions}
          />
          <div className="side-stack">
            <ProfileSummaryPanel onEdit={handleBeginProfileEdit} profile={userProfile} />
            <SavedAnalysisPanel
              errorMessage={savedAnalysesError}
              isConfigured={Boolean(health?.supabaseConfigured)}
              isLoading={isLoadingSavedAnalyses}
              items={savedAnalyses}
              onRefresh={loadSavedAnalyses}
              onSelect={handleSelectSavedAnalysis}
            />
            <PipelinePanel config={config} isRunning={isRunning} scan={scan} />
            <RoadmapPanel />
          </div>
        </section>

        <ProfileForm
          draft={profileDraft}
          errorMessage={profileError}
          isEditing={isProfileEditing}
          isSaved={Boolean(userProfile)}
          onBeginEdit={handleBeginProfileEdit}
          onCancelEdit={handleCancelProfileEdit}
          onChange={updateProfileDraft}
          onReset={handleResetProfile}
          onSave={handleSaveProfile}
          successMessage={profileSuccessMessage}
        />

        <NoticeDiscovery onSelectCandidate={handleSelectDiscoveredNotice} />

        <AnalysisDemoPanel
          analysisError={analysisError}
          analysisInputMessage={analysisInputMessage}
          analysisRawText={analysisRawText}
          analysisResult={analysisResult}
          analysisUrl={analysisUrl}
          hasProfile={Boolean(userProfile)}
          health={health}
          healthError={healthError}
          isAnalyzing={isAnalyzing}
          isSavingAnalysis={isSavingAnalysis}
          onAnalyze={handleAnalyzeOpportunity}
          onChangeRawText={updateAnalysisRawText}
          onChangeUrl={updateAnalysisUrl}
          onSaveAnalysis={handleSaveAnalysis}
          saveAnalysisError={saveAnalysisError}
          saveAnalysisMessage={saveAnalysisMessage}
        />

        <section className="result-section" aria-label="스캔 결과">
          <Metrics knownLinks={knownLinks} scan={scan} />
          <ResultTable
            analysisPendingUrl={analysisPendingUrl}
            displayMode={displayMode}
            failedSources={scan?.failedSources ?? []}
            isAnalyzing={isAnalyzing || isRunning}
            links={displayLinks}
            onAnalyzeLink={handleAnalyzeLink}
            onChangeMode={setDisplayMode}
          />
          <NoticeBriefPanel analysisProgress={noticeAnalysisProgress} briefs={noticeBriefs} />
        </section>
        </section>
      </div>
    </main>
  );
}

















