import { useEffect, useState } from "react";
import DecisionList from "../components/DecisionList";
import KnowledgeMap from "../components/KnowledgeMap";
import OnboardingSummary from "../components/OnboardingSummary";
import QuestionList from "../components/QuestionList";
import SummaryPanel from "../components/SummaryPanel";
import type { PlatformApi } from "../services/platformApi";
import type { SharedAnalysisResource } from "../types/platform";
import { sanitizeSharedResultForRender } from "../utils/shareDisclosure";

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
    return <main className="narrow-page"><section className="auth-card"><p className="section-kicker">Share unavailable</p><h1>공유 내용을 열 수 없습니다</h1><div className="notice error" role="alert">{error ?? "공유 결과가 없거나 링크가 만료되었습니다."}</div><div className="auth-choice-row"><a className="button primary" href="/demo">공개 데모 열기</a><a className="button secondary" href="/">홈으로 이동</a></div></section></main>;
  }

  const result = sanitizeSharedResultForRender(shared.result, {
    disclosureMode: shared.disclosureMode,
    includeProjectTitle: shared.projectTitle !== null,
    projectTitle: shared.projectTitle,
  });
  return (
    <main className="app-page shared-page">
      <header className="shared-heading">
        <div><p className="section-kicker">Read-only analysis</p><h1>{shared.projectTitle ?? "공유된 분석 요약"}</h1><p>읽기 전용 분석 · {formatDate(shared.completedAt)}</p></div>
        <span className="read-only-badge">수정 불가</span>
      </header>
      <div className={`notice ${shared.disclosureMode === "evidence" ? "warning" : "success"}`} role="note" aria-label="공유 공개 범위">
        {shared.disclosureMode === "evidence"
          ? "근거 공개 모드입니다. 원문 전체와 계정 정보는 숨기지만, 확인된 원문 제목과 정확한 인용문이 표시될 수 있습니다."
          : "요약 공개 모드입니다. 참여자 이름, 원문 제목, 정확한 인용문, 계정 정보와 분석 공급자 정보는 제외했습니다."}
      </div>
      <div className="results-grid overview-grid">
        <SummaryPanel result={result} />
        <DecisionList decisions={result.decisions} />
        <QuestionList questions={result.questions} />
        <OnboardingSummary summary={result.onboardingSummary} />
        <KnowledgeMap result={result} />
      </div>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short" }).format(date);
}

export default SharePage;
