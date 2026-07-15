import { CircleHelp, FileText, X } from "lucide-react";

import type { MarketAnalysis } from "../../services/marketAnalysis";
import { HOURS } from "./model";
import type { Category, Market, MarketStore } from "./types";

type MarketInspectorProps = {
  market: Market;
  selected: MarketStore;
  score: number;
  category: Category;
  radius: number;
  activeHour: number;
  sameCategoryCount: number;
  analysis: MarketAnalysis | null;
  onCloseSelection: () => void;
  onEvidenceOpen: () => void;
  onActiveHourChange: (hour: number) => void;
};

export function MarketInspector({
  market,
  selected,
  score,
  category,
  radius,
  activeHour,
  sameCategoryCount,
  analysis,
  onCloseSelection,
  onEvidenceOpen,
  onActiveHourChange,
}: MarketInspectorProps) {
  return (
    <aside className="inspector-panel">
      <div className="inspector-title">
        <div>
          <p>{selected.name}</p>
          <span>
            {selected.category} · {selected.address ?? market.address}
          </span>
          {selected.category !== category && (
            <small className="inspector-category-note">
              분석 지표는 현재 지원 업종인 {category} 기준입니다.
            </small>
          )}
        </div>
        <button type="button" className="icon-button" onClick={onCloseSelection}>
          <X size={18} />
        </button>
      </div>
      <section className="score-section">
        <div>
          <span>입지 점수</span>
          <strong>{score}</strong>
          <small>/ 100</small>
        </div>
        <b>{market.grade}</b>
        <button type="button" className="evidence-button" onClick={onEvidenceOpen}>
          점수 산정 근거 <CircleHelp size={15} />
        </button>
      </section>
      <section className="metric-section">
        <div className="section-title">
          <span>경쟁 현황</span>
          <small>{analysis ? "서울시 상권 경계" : `반경 ${radius}m`}</small>
        </div>
        <div className="competition-chart">
          <div className="donut">
            <i />
            <b>{sameCategoryCount}</b>
            <small>동일 업종</small>
          </div>
          <div className="legend-list">
            <span>
              <i className="green" /> 카페 <b>{category === "카페" ? sameCategoryCount : "-"}</b>
            </span>
            <span>
              <i className="orange" /> 음식점{" "}
              <b>{category === "음식점" ? sameCategoryCount : "-"}</b>
            </span>
            <span>
              <i className="blue" /> 베이커리{" "}
              <b>{category === "베이커리" ? sameCategoryCount : "-"}</b>
            </span>
          </div>
        </div>
      </section>
      <section className="metric-section">
        <div className="section-title">
          <span>개·폐업 추이</span>
          <small>2025.1Q 기준</small>
        </div>
        <div className="trend-bars">
          {[5, 9, 4, 12, 7, 16, 10, 14, 20, 12, 8, 17].map((value, index) => (
            <span
              key={index}
              style={{ height: `${value * 2.2}px` }}
              className={index === 4 || index === 8 ? "negative" : "positive"}
            />
          ))}
        </div>
        <div className="trend-summary">
          <span>
            <i className="positive" /> 개업 {market.opening}
          </span>
          <span>
            <i className="negative" /> 폐업 {market.closing}
          </span>
          <b>순증 {market.opening - market.closing}</b>
        </div>
      </section>
      <section className="metric-section">
        <div className="section-title">
          <span>시간대별 활동성</span>
          <small>{HOURS[Math.min(HOURS.length - 1, Math.floor(activeHour / 2))]}시대</small>
        </div>
        <div className="hour-chart">
          {market.demand.map((value, index) => (
            <button
              key={index}
              type="button"
              title={`${index * 2}시 수요 ${value}`}
              className={activeHour === index ? "active" : ""}
              style={{ height: `${Math.max(10, value)}%` }}
              onClick={() => onActiveHourChange(index)}
            >
              <span />
            </button>
          ))}
        </div>
        <div className="hour-labels">
          <span>00시</span>
          <span>06시</span>
          <span>12시</span>
          <span>18시</span>
          <span>24시</span>
        </div>
      </section>
      <section className="population-section">
        <div>
          <span>주거 인구</span>
          <b>{market.residentPopulation}</b>
        </div>
        <div>
          <span>직장 인구</span>
          <b>{market.workPopulation}</b>
        </div>
        <div>
          <span>유동 인구</span>
          <b>{market.footfall}</b>
        </div>
      </section>
      <section className="insight-section">
        <span>분석 요약</span>
        <p>{market.insight}</p>
        <button type="button" onClick={() => window.print()}>
          <FileText size={15} /> 보고서로 보기
        </button>
      </section>
    </aside>
  );
}
