import { useEffect, useState } from "react";
import DecisionList from "../components/DecisionList";
import KnowledgeMap from "../components/KnowledgeMap";
import OnboardingSummary from "../components/OnboardingSummary";
import QuestionList from "../components/QuestionList";
import SummaryPanel from "../components/SummaryPanel";
import type { PlatformApi } from "../services/platformApi";
import type { SharedAnalysisResource } from "../types/platform";

function SharePage({ api }: { api: PlatformApi }) {
  const shareToken = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
  const [shared, setShared] = useState<SharedAnalysisResource | null>(null);
  const [error, setError] = useState<string | null>(
    shareToken ? null : "공유 토큰이 없습니다. 전달받은 링크 전체를 다시 열어 주세요.",
  );
  const [loading, setLoading] = useState(Boolean(shareToken));

  useEffect(() => {
    if (!shareToken) return undefined;

    let active = true;
    api.resolveSharedAnalysis(shareToken)
      .then((result) => { if (active) setShared(result); })
      .catch((resolveError) => { if (active) setError(resolveError instanceof Error ? resolveError.message : "공유 분석을 불러오지 못했습니다."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, shareToken]);

  if (loading) return <main className="app-page"><div className="loading-card page-loader" role="status">공유 분석을 불러오는 중…</div></main>;
  if (error || !shared?.result) {
    return <main className="narrow-page"><section className="auth-card"><p className="section-kicker">Share unavailable</p><h1>공유 내용을 열 수 없습니다</h1><div className="notice error" role="alert">{error ?? "공유 결과가 없거나 링크가 만료되었습니다."}</div></section></main>;
  }

  const result = shared.result;
  return (
    <main className="app-page shared-page">
      <header className="shared-heading">
        <div><p className="section-kicker">Read-only onboarding</p><h1>{shared.projectTitle}</h1><p>읽기 전용 분석 · {formatDate(shared.completedAt)}</p></div>
        <span className="read-only-badge">수정 불가</span>
      </header>
      <div className="notice info">이 페이지는 원문 전체나 계정 정보를 포함하지 않는 공유용 분석 화면입니다.</div>
      <SummaryPanel result={result} />
      <div className="results-grid overview-grid">
        <DecisionList decisions={result.decisions} />
        <QuestionList questions={result.questions} />
        <KnowledgeMap map={result.knowledgeMap} />
        <OnboardingSummary summary={result.onboardingSummary} />
      </div>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short" }).format(date);
}

export default SharePage;
