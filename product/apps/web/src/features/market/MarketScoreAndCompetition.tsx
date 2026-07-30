import { CircleHelp, Target, TrendingUp, UsersRound } from "lucide-react";

import type { MarketAnalysis } from "../../services/marketAnalysis";
import { TermHelp } from "./TermHelp";
import type { AnalysisScope, AnalysisTopic, CategorySelection, Market } from "./types";

function formatQuarterPeriod(period: string) {
  const match = /^(\d{4})([1-4])$/.exec(period);
  return match ? `${match[1]}년 ${match[2]}분기` : period;
}

export function InspectorScoreAndCompetition({
  market,
  categorySelection,
  score,
  sameCategoryCount,
  analysis,
  analysisScope,
  topic,
  onEvidenceOpen,
}: {
  market: Market;
  categorySelection: CategorySelection;
  score: number | null;
  sameCategoryCount: number;
  analysis: MarketAnalysis | null;
  analysisScope: AnalysisScope;
  topic: AnalysisTopic;
  onEvidenceOpen: () => void;
}) {
  const showsScore =
    categorySelection.coverage === "full" &&
    analysis !== null &&
    score !== null &&
    (topic === "overview" || topic === "competition");
  const showsCompetition =
    categorySelection.coverage !== "unavailable" &&
    (analysisScope === "radius" || analysis !== null) &&
    (topic === "overview" || topic === "competition");

  if (!showsScore && !showsCompetition) return null;

  return (
    <>
      {showsScore && analysis && (
        <section className="score-section">
          <div className="score-heading">
            <span>
              상권·업종 비교점수
              <TermHelp
                term="상권·업종 비교점수"
                description="선택한 업종을 기준으로 상권 전체의 수요, 경쟁, 매출 자료를 비교한 점수입니다. 선택한 개별 점포의 평가점수나 성공 확률이 아닙니다."
              />
            </span>
            <strong>{score}</strong>
            <small>/ 100</small>
          </div>
          <p className="score-caption">
            {formatQuarterPeriod(analysis.period)} 부분 자료로 계산했습니다. 빠진 지표는 중립값으로
            반영됩니다.
          </p>
          <div className="score-key-metrics" aria-label="점수 핵심 지표">
            <div>
              <UsersRound aria-hidden="true" />
              <span>선택 분기 길단위인구 추정치</span>
              <b>
                {analysis.raw.total_flow == null
                  ? "자료 없음"
                  : `${Math.round(analysis.raw.total_flow).toLocaleString("ko-KR")}명/분기`}
              </b>
            </div>
            <div>
              <Target aria-hidden="true" />
              <span>점포 위치 기준 동일 업종</span>
              <b>{sameCategoryCount.toLocaleString("ko-KR")}개</b>
              <small>2026.06 점포 스냅샷</small>
            </div>
            <div>
              <TrendingUp aria-hidden="true" />
              <span>선택 분기 상권·업종 추정매출</span>
              <b>
                {analysis.raw.monthly_sales_amount == null
                  ? "자료 없음"
                  : `${Math.round(analysis.raw.monthly_sales_amount).toLocaleString("ko-KR")}원/분기`}
              </b>
              <small>개별 점포 매출 아님</small>
            </div>
          </div>
          <button type="button" className="evidence-button" onClick={onEvidenceOpen}>
            포함된 자료와 빠진 자료 보기 <CircleHelp size={15} />
          </button>
        </section>
      )}
      {showsCompetition && (
        <section className="metric-section">
          <div className="section-title">
            <span>경쟁 현황</span>
            <small>점포 위치 2026.06 기준 · 서울시 상권 경계</small>
          </div>
          <div className="competition-chart">
            <div className="competition-stat">
              <span>{analysisScope === "radius" ? "선택 지점 반경 내" : `${market.name} 경계 내`}</span>
              <b>{sameCategoryCount.toLocaleString("ko-KR")}개</b>
              <small>동일 업종 점포</small>
            </div>
            <div className="legend-list">
              <span>
                <i className="green" /> {categorySelection.name} <b>{sameCategoryCount}</b>
              </span>
              <small>2026.06 점포 위치 스냅샷에서 같은 업종만 집계합니다.</small>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
